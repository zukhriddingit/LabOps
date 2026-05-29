# LabOps Guardian — Shared API Contract

> **This is the single source of truth.** All three workstreams (Rasa, backend, 3D demo)
> code against *this file*. Change it here first, then tell the team in chat. Don't
> silently change a payload — someone else is depending on it.

- **Backend base URL:** `http://localhost:8000`
- **Frontend dev server:** `http://localhost:5173`
- **Rasa server:** `http://localhost:5005`  ·  **Rasa action server:** `http://localhost:5055`
- **CORS:** backend allows `http://localhost:5173` (and `*` in dev).

---

## The big idea: truth states

Every important fact the Guardian stores carries a **source label** and a **confidence**, so
the agent never pretends a camera guess is a confirmed fact. This is the feature that wins
*Most Resilient Long-Term Agent*.

```json
{
  "fact": "Sample C17 is on Bench 2",
  "source_type": "user_reported",
  "confidence": "medium",
  "timestamp": "2026-05-29T14:13:00Z"
}
```

**`source_type`** is one of:

| value | meaning |
| :-- | :-- |
| `observed_by_sensor` | a sensor reading (e.g. freezer thermometer) |
| `user_reported`      | the human told us |
| `sop_grounded`       | quoted from a local SOP document |
| `calculated`         | computed by the calculation validator |
| `camera_inferred`    | inferred from a camera frame (never certain) |
| `pending_confirmation` | drafted/awaiting a human yes |
| `human_confirmed`    | a human explicitly confirmed it |
| `stale`              | too old to trust without re-checking |

**`confidence`** is one of: `high` · `medium` · `low`.

The agent should *speak* these: "based on the local SOP…", "you reported…", "the camera
suggests, confidence medium…", "calculated…", "pending your confirmation…".

---

## Endpoints

### `GET /api/state`
Full snapshot for the 3D demo and the agent. Returns everything below.

```json
{
  "samples":   [ Sample, ... ],
  "equipment": [ Equipment, ... ],
  "inventory": [ InventoryItem, ... ],
  "reminders": [ Reminder, ... ],
  "events":    [ Event, ... ],
  "messages":  [ Message, ... ],
  "experiment_runs": [ ExperimentRun, ... ],
  "server_time": "2026-05-29T14:13:00Z"
}
```

### `GET /api/samples`
→ `[ Sample, ... ]`

### `GET /api/samples/{sample_id}`
→ `Sample`  (404 if unknown)

### `POST /api/samples/{sample_id}/move`
Move a sample and (if it leaves cold storage) start the room-temperature clock + reminders.

Request:
```json
{
  "from_location": "Freezer B",
  "to_location": "Bench 2",
  "from_temperature": "-60C",
  "allowed_room_temp_minutes": 20
}
```
Response:
```json
{
  "sample": Sample,
  "reminders": [ Reminder, ... ],
  "event": Event
}
```
Behavior:
- Update the sample's location.
- If moved to a bench / room-temperature location, set `room_temp_started_at` (now) and
  `room_temp_deadline` (now + `allowed_room_temp_minutes`).
- Create a **warning** reminder 2 min before the limit and an **escalation** reminder at the limit.
- Append an `Event` of type `sample_moved`.

### `POST /api/tools/validate_calculation`
Request:
```json
{
  "calculation_type": "percent_volume_volume",
  "target_percent": 0.02,
  "final_volume_ml": 100,
  "user_answer_ul": 20
}
```
Response:
```json
{
  "status": "correct",
  "expected_ul": 20,
  "user_answer_ul": 20,
  "formula": "0.02 / 100 * 100 mL = 0.02 mL = 20 uL",
  "assumptions": ["percent is v/v", "100 mL is the final volume"],
  "warning": "If this is w/v or a stock dilution, I need the stock concentration.",
  "source_type": "calculated",
  "confidence": "high"
}
```
`status` ∈ `correct` · `incorrect` · `ambiguous`. Supported `calculation_type` for the MVP:
`percent_volume_volume` (extend later: `percent_weight_volume`, `stock_dilution`, `molarity`).

### `POST /api/tools/retrieve_sop`
Request:
```json
{ "query": "centrifuge setup for cardiovascular tissue sample", "sample_id": "C17" }
```
Response:
```json
{
  "found": true,
  "sop_id": "cardio_tissue_prep_v2",
  "title": "Cardiovascular Tissue Prep v2",
  "checklist": ["Confirm sample type", "Confirm rotor type", "..."],
  "missing_fields": ["rotor_type"],
  "caution": "Confirm rotor type and sample type before running.",
  "source_type": "sop_grounded",
  "confidence": "high"
}
```
> **Only return content from local SOP markdown files in `labops_api/sops/`. Never invent steps.**
> If nothing matches: `{ "found": false, "message": "No matching local SOP." }`

### `POST /api/tools/find_inventory`
Request:
```json
{ "item_name": "15 mL tubes" }
```
Response:
```json
{
  "found": true,
  "item_name": "15 mL tubes",
  "location": "Shelf A, bin 3",
  "record_count": null,
  "camera_inferred_count": 2,
  "confidence": "medium",
  "source_type": "camera_inferred",
  "timestamp": "2026-05-29T13:50:00Z",
  "note": "Inventory record location is high-confidence; the count is camera-inferred."
}
```

### `POST /api/tools/create_reminder`
Request:
```json
{ "label": "Move C17 back to -60C", "due_at": "2026-05-29T14:33:00Z", "sample_id": "C17" }
```
Response → `Reminder`.

### `POST /api/tools/send_emergency_message`
Request:
```json
{
  "recipient_role": "postdoc",
  "message": "Sample C17 is at 18 minutes room temp on Bench 2. Assistance needed before the 20-minute limit.",
  "confirmed": false
}
```
Behavior:
- `confirmed: false` → return a **draft** (`status: "draft"`), do not "send".
- `confirmed: true`  → store as sent (`status: "sent"`). Simulated only — no real SMS/email.

Response → `Message`.

### `POST /api/tools/generate_handoff`
No required body (optional `{ "shift": "night" }`). Returns a structured shift handoff:
```json
{
  "generated_at": "2026-05-29T14:31:00Z",
  "sample_movements": [ ... ],
  "current_sample_status": [ ... ],
  "active_reminders": [ ... ],
  "calculations_validated": [ ... ],
  "sops_retrieved": [ ... ],
  "inventory_lookups": [ ... ],
  "messages": [ ... ],
  "unresolved_risks": ["Root cause / outcome for C17 not confirmed yet."],
  "uncertainty_note": "Some facts are user-reported or camera-inferred and not human-confirmed."
}
```

### `POST /api/events`
Frontend / simulated sensors push events here.
```json
{ "type": "camera_frame", "payload": { "...": "..." }, "source_type": "camera_inferred", "confidence": "low" }
```
Response → the stored `Event`.

---

## Object shapes

```jsonc
// Sample
{
  "sample_id": "C17",
  "name": "Cardiovascular tissue sample",
  "location": "Freezer B",
  "storage_temperature": "-60C",
  "max_room_temp_minutes": 20,
  "room_temp_started_at": null,        // ISO ts when it left cold storage, else null
  "room_temp_deadline": null,          // ISO ts of the hard limit, else null
  "source_type": "user_reported",
  "confidence": "medium",
  "updated_at": "2026-05-29T14:13:00Z"
}

// Equipment
{ "id": "freezer_b", "name": "Freezer B", "kind": "freezer",
  "current_temperature": "-60C", "status": "ok",
  "source_type": "observed_by_sensor", "confidence": "high", "updated_at": "..." }

// InventoryItem
{ "item_name": "15 mL tubes", "location": "Shelf A, bin 3", "bin": "3",
  "record_count": null, "camera_inferred_count": 2, "stock_level": "ok",
  "confidence": "medium", "source_type": "camera_inferred", "timestamp": "..." }

// Reminder
{ "id": "rem_1", "label": "C17 nearing room-temp limit", "due_at": "...",
  "sample_id": "C17", "kind": "warning",   // warning | escalation | manual
  "status": "open", "created_at": "..." }

// Event
{ "id": "evt_1", "type": "sample_moved", "payload": { ... },
  "source_type": "user_reported", "confidence": "medium", "timestamp": "..." }

// Message
{ "id": "msg_1", "recipient_role": "postdoc", "message": "...",
  "status": "draft",                       // draft | sent
  "source_type": "pending_confirmation", "timestamp": "..." }

// ExperimentRun  (long-term memory across sessions)
{ "id": "run_1", "title": "Cardio tissue prep — C17", "started_at": "...",
  "sample_ids": ["C17"], "notes": [ ... ], "status": "in_progress" }
```

---

## Ownership & merge rule

| Folder | Owner | Branch |
| :-- | :-- | :-- |
| `starter/` (Rasa + voice) | Person 1 | `feature/rasa-labops-coworker` |
| `labops_api/`, `data/`, `shared/` | Person 2 | `feature/labops-api-memory` |
| `web_demo/` | Person 3 | `feature/3d-lab-demo` |

**No one edits another person's folder.** All integration happens over HTTP against this contract.
