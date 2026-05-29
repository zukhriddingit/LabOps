# Prompts — paste-and-go for each workstream

Each teammate works in **their own folder on their own branch** and codes against
[`../shared/api_contract.md`](../shared/api_contract.md). The repo already ships a working
skeleton for all three areas — these prompts tell your AI agent (or you) what to flesh out.

| Person | Prompt | Folder | Branch |
| :-- | :-- | :-- | :-- |
| 1 — Rasa + Voice | [`person1-rasa-voice.md`](person1-rasa-voice.md) | `starter/` | `feature/rasa-labops-coworker` |
| 2 — Backend + Memory | [`person2-backend.md`](person2-backend.md) | `labops_api/`, `data/`, `shared/` | `feature/labops-api-memory` |
| 3 — 3D Lab Demo | [`person3-3d-demo.md`](person3-3d-demo.md) | `web_demo/` | `feature/3d-lab-demo` |

## How to use

1. `git checkout -b feature/<your-branch>` (or run `bash scripts/setup-branches.sh`).
2. Open your folder, read its `README.md` — a runnable baseline is already there.
3. Paste your prompt into Claude Code / Cursor and extend the skeleton.
4. **Don't edit another person's folder.** Integrate over HTTP via the contract.
