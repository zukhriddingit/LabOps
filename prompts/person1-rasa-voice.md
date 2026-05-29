# Person 1 — Rasa + Voice + Conversation Brain

> You work **only** in `starter/`. Code against `shared/api_contract.md`. A runnable
> baseline already exists — read `starter/README.md` first, then extend it. Don't rebuild
> from scratch; improve what's there.

## Goal
Build the Rasa conversation brain for LabOps Guardian — a protocol-aware, voice/text lab
coworker. It helps lab workers track samples, validate lab calculations, clarify local SOPs,
find inventory, create reminders, generate shift handoffs, and draft emergency messages to
the PI/postdoc when the user's hands are busy or contaminated.

## Ground rules
- Inspect the repo first; reuse the existing Rasa CALM scaffold and `make` commands.
- **Text demo must work even if voice fails** (`make demo-text`).
- The voice path (`voice/`) must stay compatible with the Speechmatics/Rime/Nebius setup.
- The agent must be **cautious and grounded**. It must not invent protocols.
- Use truth-state language: "based on the local SOP", "you reported", "camera-inferred,
  confidence medium", "calculated", "pending your confirmation".
- **Do not put lab logic in Rasa.** Every action calls the LabOps API over HTTP
  (`actions/labops_client.py`). Backend base URL: `http://localhost:8000` (`LABOPS_API_URL`).

## Endpoints you call (see the contract)
`GET /api/state` · `POST /api/samples/{id}/move` · `POST /api/tools/validate_calculation` ·
`/retrieve_sop` · `/find_inventory` · `/create_reminder` · `/send_emergency_message` ·
`/generate_handoff`.

## Flows to deliver (skeletons exist in `data/flows/`)
1. **Sample movement / cold-chain** — extract `sample_id`, source, destination, allowed
   minutes; call `/move`; confirm logging + reminder schedule.
2. **Calculation validation** — call `/validate_calculation`; explain briefly; ask v/v vs w/v
   vs stock if ambiguous; never confirm without stating assumptions.
3. **SOP clarification** — call `/retrieve_sop`; answer only from the retrieved SOP; ask for
   sample type / rotor / version if missing.
4. **Inventory lookup** — call `/find_inventory`; report location + confidence; distinguish
   inventory record from camera-inferred count.
5. **Emergency message** — draft concise message; ask confirmation; only then send.
6. **Handoff** — call `/generate_handoff`; summarize status, calcs, SOPs, inventory,
   reminders, unresolved items.

## Custom actions (in `actions/actions.py`)
`action_move_sample` · `action_validate_lab_calculation` · `action_retrieve_lab_sop` ·
`action_find_inventory` · `action_create_lab_reminder` · `action_send_emergency_message` ·
`action_generate_lab_handoff` · `action_get_lab_state`.

## Fallback
If the backend is unreachable, every action sets `labops_available = false` and the agent
says: "I can't reach the LabOps tool server right now. I can still collect the details, but I
won't log, validate, or send anything until it's back."

## Demo conversation to support
See `voice/script.py` — the seven-line cardio-tissue scenario (move C17 → validate calc →
find tubes → centrifuge SOP → emergency message → confirm → night handoff).

## Deliverables
Working Rasa text demo · voice path preserved · README run commands · scripted demo
conversation · minimal clean changes · passing `make test`.
