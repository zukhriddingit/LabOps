<div align="center">

# 🧪 LabOps Guardian

### A protocol-aware, voice-first coworker for wet labs

*Boston Tech Week 2026 · Rasa "Always-On AI Coworker" Hackathon*

</div>

> Wet labs don't just need a chatbot. They need a coworker that **watches samples**,
> **remembers timing constraints**, **checks tiny calculations**, **finds inventory**,
> **clarifies lab-specific SOPs**, and **speaks up when a researcher can't type because their
> gloves are contaminated.** LabOps Guardian is an always-on Rasa coworker for protocol-aware
> lab operations.

Inspired by Rasa's [Always-On AI Coworker starter](https://github.com/RasaHQ/rasa-bos-hackathon-2026),
rebuilt as a biotech-specific, three-part system you can split across a team.

---

## What it does (five lab pain points)

1. **Measurement & calculation checking** — "0.02% in 100 mL, I got 20 µL — right?" →
   validated *with assumptions* (v/v vs w/v vs stock).
2. **Sample storage & timing surveillance** — log C17 out of -60°C onto the bench; the
   Guardian starts a room-temp timer and escalates at the limit.
3. **Inventory & location memory** — "Where are the 15 mL tubes?" → Shelf A bin 3, *with a
   confidence level* (camera-inferred ≠ confirmed).
4. **Protocol & equipment clarification** — grounded in **local SOPs only**, never internet vibes.
5. **Emergency voice dispatch** — draft → confirm → message the PI/postdoc, hands-free.

**The winning idea: truth states.** Every fact carries a `source_type`
(`user_reported`, `camera_inferred`, `sop_grounded`, `calculated`, `human_confirmed`, …) and a
`confidence`. The agent never presents a guess as a confirmed fact → *Most Resilient Long-Term Agent*.

---

## Architecture

```
        3D Lab Demo  (web_demo/)            Rasa Coworker  (starter/)
        React + Three.js                    voice/text · CALM flows · custom actions
              │                                     │
              └──────────── HTTP ───────────────────┘
                              │
                     LabOps Backend  (labops_api/)
                     FastAPI · sample + inventory memory · SOP retrieval
                     calculation validator · reminders · handoffs · truth states
                              │
              Speechmatics (ears) · Rime (voice) · Nebius (LLM)
```

Everything integrates over HTTP against one document:
**[`shared/api_contract.md`](shared/api_contract.md)** — read it first.

---

## Repo layout

```
LabOps Guardian/
├─ shared/api_contract.md     ← single source of truth (endpoints + truth states + ownership)
├─ prompts/                   ← paste-and-go prompt per teammate
├─ starter/                   ← Person 1: Rasa CALM coworker + voice  (Speechmatics/Rime/Nebius)
├─ labops_api/                ← Person 2: FastAPI backend + lab memory + SOPs  (runnable now)
├─ web_demo/                  ← Person 3: 3D React/R3F command center
└─ scripts/setup-branches.sh  ← create the three feature branches
```

---

## Quickstart

```bash
git init && git add -A && git commit -m "LabOps Guardian starter"
bash scripts/setup-branches.sh        # feature/rasa-labops-coworker, /labops-api-memory, /3d-lab-demo
```

**1) Backend (do this first — it unblocks the other two):**
```bash
pip install -r labops_api/requirements.txt
python -m labops_api.seed_data
uvicorn labops_api.app:app --reload --port 8000      # http://localhost:8000/docs
```

**2) Rasa coworker:**
```bash
cd starter && cp .env.example .env   # paste keys
make install && make train
make run-actions   |   make run-rasa   |   make demo-text     # 3 terminals
```

**3) 3D demo:**
```bash
cd web_demo && npm install && npm run dev                      # http://localhost:5173
```

---

## Team split

| Person | Owns | Folder | Branch |
| :-- | :-- | :-- | :-- |
| 1 | Rasa flows, voice, grounded language | `starter/` | `feature/rasa-labops-coworker` |
| 2 | FastAPI, lab memory, tools, SOPs | `labops_api/`, `data/`, `shared/` | `feature/labops-api-memory` |
| 3 | 3D scene, panels, demo controls | `web_demo/` | `feature/3d-lab-demo` |

**Merge rule:** no one edits another person's folder. All integration is HTTP via the contract.
Each teammate's prompt is in [`prompts/`](prompts/).

---

## Demo story (cardio tissue workflow)

Move C17 from Freezer B → Bench 2 (timer starts) → validate a reagent calc → locate 15 mL
tubes (confidence medium) → retrieve the centrifuge SOP → 18-min warning → draft + send a
postdoc message → generate the night-shift handoff. All seven beats are wired across the three
components and scripted in `starter/voice/script.py` and `web_demo`'s transcript panel.

## Credits
Built on ideas from Rasa's hackathon starter (CALM, cross-session memory, Speechmatics + Rime
+ Nebius voice stack). MIT licensed.
