// Procedural, fully-offline textures for the lab scene.
// Everything is drawn on a <canvas> at runtime (client-only) — no image/HDR
// downloads — so the demo renders identically with no network. Normal maps are
// derived from grayscale height fields via a Sobel pass, which gives physically
// plausible bumps for floor seams, brushed metal, and wall stipple.
//
// All factories are lazy + cached by key, so a given texture is built once.

import * as THREE from "three";

/* ----------------------------------------------------------------------- */
/* small utilities                                                          */
/* ----------------------------------------------------------------------- */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _cache = new Map<string, THREE.Texture>();
function cached<T extends THREE.Texture>(key: string, make: () => T): T {
  const hit = _cache.get(key);
  if (hit) return hit as T;
  const tex = make();
  _cache.set(key, tex);
  return tex;
}

function makeCanvas(w: number, h: number) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  return ctx ? { c, ctx } : null;
}

// 1×1 fallback so callers always receive a usable Texture during SSR.
function fallback(hex: string): THREE.Texture {
  const data = new Uint8Array([
    ...hexToRgb(hex),
    255,
  ]);
  const t = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  t.needsUpdate = true;
  return t;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function shade(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

/* ----------------------------------------------------------------------- */
/* normal map from a grayscale height field (Sobel)                         */
/* ----------------------------------------------------------------------- */

function normalFromHeight(
  size: number,
  drawHeight: (ctx: CanvasRenderingContext2D, s: number) => void,
  strength = 2.0
): THREE.Texture {
  const made = makeCanvas(size, size);
  if (!made) return fallback("#8080ff");
  const { ctx } = made;

  // height pass (grayscale)
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  drawHeight(ctx, size);
  const h = ctx.getImageData(0, 0, size, size).data;
  const height = (x: number, y: number) => {
    const xi = (x + size) % size;
    const yi = (y + size) % size;
    return h[(yi * size + xi) * 4] / 255;
  };

  // sobel → normal
  const out = makeCanvas(size, size);
  if (!out) return fallback("#8080ff");
  const img = out.ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        height(x - 1, y - 1) +
        2 * height(x - 1, y) +
        height(x - 1, y + 1) -
        height(x + 1, y - 1) -
        2 * height(x + 1, y) -
        height(x + 1, y + 1);
      const dy =
        height(x - 1, y - 1) +
        2 * height(x, y - 1) +
        height(x + 1, y - 1) -
        height(x - 1, y + 1) -
        2 * height(x, y + 1) -
        height(x + 1, y + 1);
      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  out.ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(out.c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/* ----------------------------------------------------------------------- */
/* floor — polished epoxy tile: seam normal + smudge roughness              */
/* ----------------------------------------------------------------------- */

export function floorNormalTexture(repeat = 6): THREE.Texture {
  return cached(`floorNormal:${repeat}`, () => {
    const tex = normalFromHeight(
      256,
      (ctx, s) => {
        // grout seams every half-tile → recessed dark grooves
        ctx.strokeStyle = "#2a2a2a";
        ctx.lineWidth = 3;
        const step = s / 2;
        for (let i = 0; i <= s; i += step) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, s);
          ctx.moveTo(0, i);
          ctx.lineTo(s, i);
          ctx.stroke();
        }
      },
      1.4
    );
    tex.repeat.set(repeat, repeat);
    return tex;
  });
}

export function floorRoughnessTexture(repeat = 4): THREE.Texture {
  return cached(`floorRough:${repeat}`, () => {
    const made = makeCanvas(256, 256);
    if (!made) return fallback("#3a3a3a");
    const { c, ctx } = made;
    ctx.fillStyle = "#444"; // mid roughness base
    ctx.fillRect(0, 0, 256, 256);
    const rng = mulberry32(7);
    // soft smudges / wear: lighter = rougher (kills mirror in patches)
    for (let i = 0; i < 60; i++) {
      const x = rng() * 256;
      const y = rng() * 256;
      const r = 10 + rng() * 46;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.05 + rng() * 0.12;
      g.addColorStop(0, `rgba(150,150,150,${a})`);
      g.addColorStop(1, "rgba(150,150,150,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.repeat.set(repeat, repeat);
    return tex;
  });
}

/* ----------------------------------------------------------------------- */
/* brushed stainless — fine directional streaks                             */
/* ----------------------------------------------------------------------- */

export function brushedNormalTexture(repeat: [number, number] = [3, 1]): THREE.Texture {
  return cached(`brushed:${repeat.join(",")}`, () => {
    const tex = normalFromHeight(
      256,
      (ctx, s) => {
        const rng = mulberry32(11);
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 900; i++) {
          const y = rng() * s;
          const v = 90 + rng() * 90;
          ctx.strokeStyle = `rgb(${v},${v},${v})`;
          ctx.lineWidth = 0.5 + rng();
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(s, y + (rng() - 0.5) * 4);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
      0.6
    );
    tex.repeat.set(repeat[0], repeat[1]);
    return tex;
  });
}

/* ----------------------------------------------------------------------- */
/* wall — faint stipple so flat paint isn't dead flat                       */
/* ----------------------------------------------------------------------- */

export function wallNormalTexture(repeat = 4): THREE.Texture {
  return cached(`wall:${repeat}`, () => {
    const tex = normalFromHeight(
      256,
      (ctx, s) => {
        const rng = mulberry32(23);
        for (let i = 0; i < 2600; i++) {
          const x = rng() * s;
          const y = rng() * s;
          const v = 110 + rng() * 70;
          ctx.fillStyle = `rgb(${v},${v},${v})`;
          ctx.fillRect(x, y, 1, 1);
        }
      },
      0.35
    );
    tex.repeat.set(repeat, repeat);
    return tex;
  });
}

/* ----------------------------------------------------------------------- */
/* equipment LCD/OLED screen                                                */
/* ----------------------------------------------------------------------- */

export interface ScreenLine {
  text: string;
  size?: number; // px in the 512×256 space
  color?: string;
  weight?: "normal" | "bold";
}

export function screenTexture(opts: {
  lines: ScreenLine[];
  bg?: string;
  width?: number;
  height?: number;
  accent?: string;
}): THREE.Texture {
  const key = `screen:${JSON.stringify(opts)}`;
  return cached(key, () => {
    const W = opts.width ?? 512;
    const H = opts.height ?? 256;
    const bg = opts.bg ?? "#06121f";
    const made = makeCanvas(W, H);
    if (!made) return fallback(bg);
    const { c, ctx } = made;

    // glossy dark-glass gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, shade(bg, 1.5));
    g.addColorStop(0.45, bg);
    g.addColorStop(1, shade(bg, 0.6));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // inner bezel
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, W - 16, H - 16);

    // scanlines
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#ffffff";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.globalAlpha = 1;

    // accent corner tick
    if (opts.accent) {
      ctx.fillStyle = opts.accent;
      ctx.fillRect(20, 24, 46, 6);
    }

    // text lines, vertically centered as a block
    const lines = opts.lines;
    const total = lines.reduce((s, l) => s + (l.size ?? 52) + 14, 0);
    let y = H / 2 - total / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const l of lines) {
      const size = l.size ?? 52;
      const color = l.color ?? opts.accent ?? "#7ee5ff";
      ctx.font = `${l.weight ?? "bold"} ${size}px ui-monospace, "SF Mono", Menlo, monospace`;
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 0.5;
      ctx.fillStyle = color;
      ctx.fillText(l.text, W / 2, y);
      y += size + 14;
    }
    ctx.shadowBlur = 0;

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  });
}

/* ----------------------------------------------------------------------- */
/* signage / nameplate / decal                                              */
/* ----------------------------------------------------------------------- */

export function signTexture(opts: {
  title: string;
  subtitle?: string;
  bg?: string;
  fg?: string;
  accent?: string;
  width?: number;
  height?: number;
  align?: "center" | "left";
}): THREE.Texture {
  const key = `sign:${JSON.stringify(opts)}`;
  return cached(key, () => {
    const W = opts.width ?? 1024;
    const H = opts.height ?? 256;
    const bg = opts.bg ?? "#1f5fa8";
    const fg = opts.fg ?? "#f2f9ff";
    const made = makeCanvas(W, H);
    if (!made) return fallback(bg);
    const { c, ctx } = made;

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, shade(bg, 1.18));
    g.addColorStop(1, shade(bg, 0.85));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (opts.accent) {
      ctx.fillStyle = opts.accent;
      ctx.fillRect(0, H - 14, W, 14);
      ctx.fillRect(0, 0, W, 8);
    }

    const left = opts.align === "left";
    const cx = left ? 56 : W / 2;
    ctx.textAlign = left ? "left" : "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = fg;
    const ty = opts.subtitle ? H * 0.4 : H * 0.5;
    ctx.font = `bold ${Math.round(H * 0.34)}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillText(opts.title, cx, ty);
    if (opts.subtitle) {
      ctx.font = `500 ${Math.round(H * 0.16)}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.fillText(opts.subtitle, cx, H * 0.72);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  });
}

// Engraved equipment nameplate (brushed-silver look, dark engraved text).
export function nameplateTexture(code: string, label: string): THREE.Texture {
  return cached(`plate:${code}:${label}`, () => {
    const W = 512;
    const H = 128;
    const made = makeCanvas(W, H);
    if (!made) return fallback("#c9d2dd");
    const { c, ctx } = made;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#e8edf3");
    g.addColorStop(0.5, "#c4ccd6");
    g.addColorStop(1, "#dde3ea");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = "#1c2838";
    ctx.font = `bold 58px "Segoe UI", system-ui, sans-serif`;
    ctx.fillText(code, 28, H / 2);
    ctx.font = `500 38px "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = "#39485c";
    ctx.fillText(label, 150, H / 2 + 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  });
}

/* ----------------------------------------------------------------------- */
/* gradient (pastel accent stripes)                                         */
/* ----------------------------------------------------------------------- */

export function gradientTexture(stops: string[], horizontal = true): THREE.Texture {
  return cached(`grad:${stops.join("_")}:${horizontal}`, () => {
    const W = horizontal ? 512 : 8;
    const H = horizontal ? 8 : 512;
    const made = makeCanvas(W, H);
    if (!made) return fallback(stops[0] ?? "#ffffff");
    const { c, ctx } = made;
    const g = horizontal
      ? ctx.createLinearGradient(0, 0, W, 0)
      : ctx.createLinearGradient(0, 0, 0, H);
    const n = Math.max(1, stops.length - 1);
    stops.forEach((s, i) => g.addColorStop(stops.length === 1 ? 0 : i / n, s));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  });
}

/* ----------------------------------------------------------------------- */
/* shared PBR constants                                                     */
/* ----------------------------------------------------------------------- */

export const ENV_INTENSITY = 1.0;
