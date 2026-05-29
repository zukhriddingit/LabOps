# Person 2 — Backend + Lab Memory + Tools

> You work in `labops_api/` (and may update `shared/api_contract.md` + `data/`). A working
> FastAPI baseline already exists — read `labops_api/README.md`, run it, then extend.

## Goal
The LabOps Guardian backend: a FastAPI service that is the lab's persistent memory and tool
layer for the Rasa coworker (`starter/`) and the 3D demo (`web_demo/`). JSON-file storage,
no database, CORS enabled for `http://localhost:5173`.

## What it manages
Sample locations · sample temperature/timing state · inventory locations · simple lab
calculation validation · local SOP retrieval · reminders · simulated emergency messaging ·
long-term experiment/run memory · handoff generation · **truth-state labels**.

## Truth-state system (the differentiator)
Every important fact carries `source_type` (`observed_by_sensor` · `user_reported` ·
`sop_grounded` · `calculated` · `camera_inferred` · `pending_confirmation` ·
`human_confirmed` · `stale`) + `confidence` (`high`/`medium`/`low`) + `timestamp`.

## Layout (exists — extend)
```
labops_api/
  app.py models.py storage.py tools.py seed_data.py requirements.txt README.md demo.sh
  data/   samples.json inventory.json equipment.json events.json reminders.json messages.json experiment_runs.json
  sops/   cardio_tissue_prep_v2.md freezer_sample_storage.md centrifuge_setup.md reagent_calculation_policy.md
```

## Seed data
- Samples: **C17** (cardiovascular tissue, Freezer B, -60C, max room temp 20 min), **A12** (backup).
- Equipment: Freezer B (-60C), Centrifuge 2, Microscope 1, Bench 2, Storage Shelf A.
- Inventory: 15 mL tubes (Shelf A bin 3, camera sees 2 boxes, confidence medium); pipette
  tips (Shelf A bin 1, low stock); reagent bottles (Chemical Cabinet 1).

## Endpoints (full spec in `shared/api_contract.md`)
`GET /api/state` · `GET /api/samples` · `GET /api/samples/{id}` · `POST /api/samples/{id}/move`
· `POST /api/tools/validate_calculation` · `/retrieve_sop` · `/find_inventory` ·
`/create_reminder` · `/send_emergency_message` · `/generate_handoff` · `POST /api/events`.

Key behaviors:
- **/move**: update location; if moved to a bench/room-temp spot set `room_temp_started_at`
  + deadline; create a warning reminder before the limit and an escalation at the limit; log an event.
- **/validate_calculation**: compute expected volume; return correct/incorrect/ambiguous with
  formula + assumptions + warning. (0.02% v/v in 100 mL → 20 µL.)
- **/retrieve_sop**: return content **only from local SOP markdown** — never invent steps;
  include checklist, missing fields, caution.
- **/find_inventory**: location + record vs camera-inferred count + confidence + timestamp.
- **/send_emergency_message**: `confirmed:false` → draft; `confirmed:true` → "sent" (simulated).
- **/generate_handoff**: structured summary incl. unresolved risks + uncertainty note.

## Quality
Type hints · clean Pydantic models · basic error handling · CORS for `http://localhost:5173`.

```bash
pip install -r labops_api/requirements.txt
python -m labops_api.seed_data
uvicorn labops_api.app:app --reload --port 8000
bash labops_api/demo.sh        # smoke test
```

## Deliverables
Working FastAPI backend · seed data · shared API contract kept in sync · curl/README examples.
