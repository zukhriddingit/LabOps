# LabOps Guardian — 3D demo (Person 3)

A 3D wet-lab "command center" for LabOps Guardian. **Next.js + React Three Fiber + Zustand**
(architecture inspired by [v1hns/medsim](https://github.com/v1hns/medsim)). Visualizes sample
movement, the room-temp timer, inventory, equipment, and emergency messaging — and sends
**structured** events to the LabOps backend so the 3D view and the Rasa agent share state.

> No computer vision. The "camera" is a **simulated shelf/sensor counter** — structured data
> only (records + deterministic counts + confidence labels). No webcam, upload, or CV models.

## Run (one command after install)

```bash
cd web_demo
npm install
npm run dev          # http://localhost:5173
```

Other scripts: `npm run typecheck` · `npm run build` · `npm start`.

Backend assumed at `http://localhost:8000` (override `NEXT_PUBLIC_LABOPS_API_URL`). **If the
backend is down**, the header shows *disconnected (mock)* and the demo stays fully usable on
deterministic mock data.

## UI (MedSim-inspired)

- **Full-bleed 3D scene** — grid floor, fog, contact shadows, rounded low-poly equipment.
- **Floating pins** on every object (MedSim-style code chip + pulsing dot). Click a pin → a
  contextual **info card** with details and quick actions (Move C17, Find tubes, Draft message).
  C17's pin tracks its live status colour and pulses on warning/critical.
- **Bottom HUD bar** — live stats (room-temp timer, C17 status, alerts, inventory, backend) and
  an **OPEN DASHBOARD** button. The full dashboard is hidden by default and slides in on demand.
- **Dashboard** (slide-in) — Status, Demo Controls, Inventory, PI/Postdoc message, Transcript.

## Structure

```
web_demo/
  app/                  layout.tsx · page.tsx (clock + poll) · globals.css
  components/
    lab/                LabScene · Equipment · SampleC17 · StatusPanel ·
                        InventoryPanel · DemoControls · TranscriptPanel · MessagePanel
    shared/             Panel · Badge
  lib/                  api.ts (LabOps client) · mockData.ts (fallback)
  store/                labStore.ts (Zustand — the demo brain)
  types/                lab.ts
```

## Scene objects

Freezer B · Backup Freezer D · Bench 2 · Sample C17 · Inventory Shelf A · Chemical Cabinet 1
· Centrifuge 2 · Microscope 1 · simulated camera/shelf sensor node · PI/Postdoc station.

## Demo flow (Demo Controls panel)

1. **Move C17 to Bench** → vial animates Freezer B → Bench 2, `POST /api/samples/C17/move`,
   the room-temp timer starts.
2. Fast mode: **20 lab min ≈ 20 s** — warning at 18 s (C17 turns amber, "near limit"),
   critical at 20 s (C17 pulses red, "exceeded limit — escalation recommended").
3. **Find 15 mL tubes** → highlights Shelf A and posts a structured event:
   ```json
   { "event_type": "inventory_observation", "source_type": "simulated_camera_counter",
     "item_id": "15ml_tubes", "item_name": "15 mL tubes", "location": "Shelf A / Bin 3",
     "visible_count": 2, "unit": "boxes", "confidence": "medium" }
   ```
   Panel shows the official record vs the simulated count + confidence + "human confirmation
   recommended".
4. **Draft emergency message** → updates the PI/Postdoc panel and calls
   `/api/tools/send_emergency_message` with `confirmed=false` (draft only).
5. **Move C17 to Backup Freezer** → status `stabilized`. **Reset demo** restores the start state.

## Backend endpoints used

`GET /api/state` (health) · `POST /api/samples/{id}/move` · `POST /api/events` ·
`POST /api/tools/send_emergency_message`. All wrapped in `lib/api.ts`; failures degrade to
mock without breaking the demo.

## Reliability notes
- Never claims real detection — inventory is always labelled *simulated camera counter*.
- Official inventory record is distinct from the simulated visible count.
- Works with **no backend and no API keys**.
