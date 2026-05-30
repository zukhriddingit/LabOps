// Browser-native voice using the Web Speech API. No API keys, no network.
// ASR: SpeechRecognition (Chrome/Edge). TTS: speechSynthesis (all modern browsers).
// Everything is feature-detected so the app still works (text fallback) where it's missing.

/* eslint-disable @typescript-eslint/no-explicit-any */

export function recognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
}

export function speechSynthSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export interface Recognizer {
  start: () => void;
  stop: () => void;
}

/**
 * Create a one-shot recognizer. Calls onPartial with interim text and onFinal with
 * the final transcript, then stops. onEnd always fires when the session ends.
 */
export function createRecognizer(opts: {
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}): Recognizer | null {
  if (!recognitionSupported()) return null;
  const Ctor: any =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  rec.onresult = (e: any) => {
    let interim = "";
    let final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (interim && opts.onPartial) opts.onPartial(interim);
    if (final) opts.onFinal(final.trim());
  };
  rec.onerror = (e: any) => opts.onError?.(e.error ?? "speech-error");
  rec.onend = () => opts.onEnd?.();

  return {
    start: () => {
      try {
        rec.start();
      } catch {
        /* already started */
      }
    },
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* not running */
      }
    },
  };
}

let preferredVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechSynthSupported()) return null;
  if (preferredVoice) return preferredVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  preferredVoice =
    voices.find((v) => /en-US/i.test(v.lang) && /Google|Samantha|Aria|Jenny/i.test(v.name)) ||
    voices.find((v) => /en-US/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    voices[0];
  return preferredVoice;
}

const VOICE_GATEWAY_URL =
  process.env.NEXT_PUBLIC_VOICE_GATEWAY_URL ?? "http://localhost:8010";

// Turn a markdown/rich reply into a clean, natural utterance for TTS:
// drop markup, LaTeX, emojis; spell common units; make each list item its own
// sentence so the voice pauses instead of running everything together.
export function toSpeech(input: string): string {
  let t = input ?? "";
  t = t.replace(/```[\s\S]*?```/g, " ");                       // code fences
  t = t.replace(/\$\$[\s\S]*?\$\$/g, " ").replace(/\$[^$\n]*\$/g, " "); // LaTeX
  t = t.replace(/\\\[[\s\S]*?\\\]/g, " ").replace(/\\\([\s\S]*?\\\)/g, " ");
  t = t.replace(/`([^`]+)`/g, "$1");                            // inline code
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");                  // images
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");                // links → text
  t = t.replace(/^\s{0,3}#{1,6}\s*/gm, "");                     // headings
  t = t.replace(/^\s*>\s?/gm, "");                              // blockquotes
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1"); // bold
  t = t.replace(/\*([^*]+)\*/g, "$1").replace(/(^|\s)_([^_]+)_(?=\s|$)/g, "$1$2"); // italic
  t = t.replace(/\|/g, " ").replace(/^-{3,}\s*$/gm, " ");       // tables / hr
  // spell out units/symbols a voice would mangle
  t = t.replace(/°\s*C/gi, " degrees Celsius").replace(/°\s*F/gi, " degrees Fahrenheit").replace(/°/g, " degrees");
  t = t.replace(/(\d)\s*%/g, "$1 percent").replace(/%/g, " percent");
  t = t.replace(/µ/g, "micro").replace(/×/g, " times").replace(/→/g, " to ");
  // strip emojis / pictographs / arrows
  t = t.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, "");
  // each non-empty line becomes a sentence (so list bullets get a pause)
  const lines = t
    .split(/\r?\n+/)
    .map((s) => s.replace(/^\s*[-*+]\s+/, "").replace(/^\s*\d+[.)]\s+/, "").trim())
    .filter(Boolean)
    .map((s) => (/[.!?:,;]$/.test(s) ? s : s + "."));
  return lines.join(" ").replace(/\s{2,}/g, " ").trim();
}

let currentAudio: HTMLAudioElement | null = null;
let speakToken = 0;

// Primary TTS: the voice gateway (Speechmatics). Resolves true if it played audio.
async function speakViaGateway(text: string, token: number, onEnd?: () => void): Promise<boolean> {
  try {
    const resp = await fetch(`${VOICE_GATEWAY_URL}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!resp.ok) return false;
    const blob = await resp.blob();
    if (!blob.size) return false;
    if (token !== speakToken) return true; // superseded/cancelled — swallow without playing
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    let finished = false;
    const done = () => {
      if (finished) return; // guard against error+ended both firing
      finished = true;
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      onEnd?.();
    };
    audio.addEventListener("ended", done, { once: true });
    audio.addEventListener("error", done, { once: true });
    if (token !== speakToken) {
      URL.revokeObjectURL(url); // cancelled between fetch and play
      return true;
    }
    currentAudio = audio;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

// Fallback TTS: browser Web Speech API (used only if the gateway is unreachable).
function speakViaBrowser(text: string, onEnd?: () => void): void {
  if (!speechSynthSupported()) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = 1.03;
  u.pitch = 1.0;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

// Speak a reply — Speechmatics voice gateway first, browser Web Speech as fallback.
// The raw (markdown) text is cleaned to a natural utterance before speaking.
export function speak(text: string, onEnd?: () => void): void {
  const spoken = toSpeech(text);
  if (!spoken.trim()) {
    onEnd?.();
    return;
  }
  cancelSpeak();
  const token = ++speakToken;
  void speakViaGateway(spoken, token, onEnd).then((ok) => {
    if (!ok && token === speakToken) speakViaBrowser(spoken, onEnd);
  });
}

export function cancelSpeak(): void {
  speakToken++; // invalidate any in-flight gateway request
  if (currentAudio) {
    try {
      currentAudio.pause();
    } catch {
      /* noop */
    }
    currentAudio = null;
  }
  if (speechSynthSupported()) window.speechSynthesis.cancel();
}

// Voices load async in some browsers — warm them up.
export function warmUpVoices(): void {
  if (!speechSynthSupported()) return;
  pickVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    preferredVoice = null;
    pickVoice();
  };
}
