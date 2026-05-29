# LabOps Guardian — Rasa coworker (Person 1)

The conversation brain: a voice/text **protocol-aware lab coworker** built on the Rasa CALM
scaffold. It tracks samples, validates lab calculations, clarifies local SOPs, finds
inventory, drafts emergency messages, and produces shift handoffs.

It does **no lab logic itself** — every flow calls the LabOps API
([`../labops_api`](../labops_api)) over HTTP and speaks the results back with truth-state
language ("based on the local SOP…", "camera-inferred, confidence medium…").

## Architecture

```
 you ──▶ Speechmatics ASR ──▶ Rasa CALM (+ Nebius) ──▶ Rime TTS ──▶ you
                                   │
                                   └── custom actions ──HTTP──▶ LabOps API (:8000)
```

## Setup (once)

```bash
cd starter
cp .env.example .env      # paste your keys (Rasa Pro, Nebius, Speechmatics, Rime)
make install
make verify               # keys, deps, files, services
make train
```

## Run (the LabOps API must be running on :8000 first — see ../labops_api)

```bash
# three terminals:
make run-actions   # Tab 1 — action server (:5055)
make run-rasa      # Tab 2 — Rasa server (:5005)
make demo-text     # Tab 3 — type to the Guardian   (or `make demo` for the voice loop)
```

## Flows

| Flow | File | What it does |
| :-- | :-- | :-- |
| `move_sample` | `data/flows/sample_move.yml` | log a sample move + start the cold-chain timer |
| `validate_calculation` | `data/flows/validate_calculation.yml` | check a reagent calc, state assumptions |
| `retrieve_sop` | `data/flows/retrieve_sop.yml` | answer only from a local SOP |
| `find_inventory` | `data/flows/find_inventory.yml` | locate an item + report confidence |
| `emergency_message` | `data/flows/emergency_message.yml` | draft → confirm → send to PI/postdoc |
| `generate_handoff` | `data/flows/handoff.yml` | structured shift handoff |

Custom actions live in `actions/actions.py`; the HTTP wrapper is `actions/labops_client.py`.

## Scripted demo conversation (`voice/script.py`)

1. "Guardian, I'm taking Cardio Sample C17 out of minus 60 and putting it on Bench 2. It can stay at room temperature for 20 minutes."
2. "I calculated 20 microliters for 0.02 percent in 100 mL. Is that correct?"
3. "Where are the 15 mL tubes?"
4. "What centrifuge setup applies for this tissue sample?"
5. "My gloves are contaminated. Message the postdoc that C17 is near the room-temp limit."
6. "Yes, send it."
7. "Give the night shift a handoff."

## Notes
- **Text mode always works**, even if voice keys are missing (`make demo-text`).
- If the LabOps API is down, every action sets `labops_available = false` and the agent says
  it can't log/validate/send yet — it never fabricates a result.
- Grounding: SOP answers come only from `../labops_api/sops/*.md`. The agent must not invent
  protocol steps.
