# Person 3 — 3D Lab Demo + Visual Workflow

> You work **only** in `web_demo/`. Code against `shared/api_contract.md`. A runnable Vite +
> React + R3F baseline already exists — read `web_demo/README.md`, run `npm install && npm run
> dev`, then make it memorable.

## Goal
A web-based 3D wet-lab scene that visualizes sample movement, timing surveillance, inventory,
equipment/SOP context, and emergency messaging — and connects to the LabOps backend so the
visual and the Rasa coworker share state.

## Stack
Vite · React · TypeScript · React Three Fiber · Drei · plain CSS. No Unity, no heavy assets.

## Backend
`http://localhost:8000` (override `VITE_LABOPS_API_URL`). Use `GET /api/state`,
`POST /api/events`, `POST /api/samples/C17/move`. Fall back to `MOCK_STATE` when down.

## Scene (baseline exists in `components/LabScene.tsx`)
Freezer B · Bench 2 · Sample C17 · Centrifuge 2 · Microscope 1 · Storage Shelf A · Chemical
Cabinet 1 · camera/sensor node · PI/postdoc station. Simple geometry, labels, alert
rings/pulses, command-center styling.

## Main interaction
**Move C17 to Bench**: animate the vial freezer → bench; `POST /api/samples/C17/move`
(`from Freezer B`, `to Bench 2`, `-60C`, 20 min); start a visible timer above C17; warning at
18 min, critical at 20 min. **Fast mode** simulates 20 min in 20 s.

## Panels (baselines exist)
1. **Status** — C17 location, room-temp timer, active reminders, inventory status, last
   message, backend connected/disconnected.
2. **Inventory** — 15 mL tubes: Shelf A bin 3, camera-inferred count 2, confidence medium.
3. **Transcript** — the scripted conversation, advanceable.
4. **Demo controls** — Move C17 · 18-min warning · 20-min escalation · inventory lookup ·
   draft emergency message · reset.

## Important
The frontend must **not be only decoration** — `Move C17` and the inventory/message buttons
hit the real backend so all three workstreams stay in sync.

## Fallback
Backend down → show "Backend disconnected", use mock state, keep the demo usable.

## Deliverables
Working `web_demo` app · `src/api.ts` wrapper · components `LabScene` / `StatusPanel` /
`InventoryPanel` / `DemoControls` / `TranscriptPanel` · README run commands.
