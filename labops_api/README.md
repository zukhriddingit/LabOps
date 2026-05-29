# LabOps API — backend & lab memory (Person 2)

FastAPI tool server that acts as the lab's persistent memory and tool layer for the Rasa
coworker (`starter/`) and the 3D demo (`web_demo/`). JSON-file storage, no database.

See [`../shared/api_contract.md`](../shared/api_contract.md) for the full endpoint spec —
**that file is the source of truth.**

## Run

```bash
python -m venv .venv && source .venv/bin/activate     # optional
pip install -r labops_api/requirements.txt
python -m labops_api.seed_data        # (re)seed the cardio-tissue demo state
uvicorn labops_api.app:app --reload --port 8000
```

Open http://localhost:8000/docs for interactive Swagger docs.

## Layout

```
labops_api/
  app.py          FastAPI app + all endpoints + CORS
  models.py       Pydantic models (incl. the truth-state fields)
  storage.py      JSON-file persistence (data/*.json)
  tools.py        calculation / SOP / inventory / handoff logic
  seed_data.py    reset to the demo scenario
  data/*.json     persistent memory (samples, inventory, events, ...)
  sops/*.md       local SOP documents — the ONLY source for retrieve_sop
```

## Smoke test

```bash
bash labops_api/demo.sh        # runs the core endpoints with curl
```

## Truth states
Every fact carries `source_type` (`user_reported`, `camera_inferred`, `sop_grounded`,
`calculated`, …) and `confidence` (`high`/`medium`/`low`). Never strip these — they're how
the Guardian stays honest. See the contract for the full list.
