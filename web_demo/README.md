# LabOps Guardian — 3D demo (Person 3)

A web-based 3D wet-lab "command center" that visualizes sample movement, the room-temp
timer, inventory, equipment, and emergency messaging. Vite + React + TypeScript + React
Three Fiber. It sends **real events** to the LabOps API so the visual and the Rasa coworker
share state.

## Run

```bash
cd web_demo
npm install
npm run dev        # http://localhost:5173
```

Backend assumed at `http://localhost:8000` (override with `VITE_LABOPS_API_URL`). If the
backend is down, the app shows "backend disconnected" and runs on mock state.

## What's here

```
src/
  api.ts                  fetch wrapper + MOCK_STATE fallback
  types.ts                shapes mirroring shared/api_contract.md
  App.tsx                 state, polling, the room-temp timer (+ fast mode)
  components/
    LabScene.tsx          3D scene: freezer, bench, C17, centrifuge, shelf, camera node
    StatusPanel.tsx       C17 location, timer, reminders, message, connection
    InventoryPanel.tsx    15 mL tubes + camera count + confidence tags
    DemoControls.tsx      Move C17 / warning / escalation / lookup / draft msg / reset
    TranscriptPanel.tsx   the scripted demo conversation (advanceable)
```

## Demo interaction

- **Move C17 to Bench** → animates the vial freezer → bench, POSTs `/api/samples/C17/move`,
  starts the timer.
- **Fast mode** simulates the 20-minute limit in 20 seconds for the stage.
- Warning at 18 min (amber), critical at 20 min (red), with pulsing alert ring on the vial.

The frontend is not just decoration — `Move C17` and the inventory/message buttons hit the
real backend so all three workstreams stay in sync.
