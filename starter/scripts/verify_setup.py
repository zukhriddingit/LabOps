#!/usr/bin/env python3
"""Pre-flight diagnostics for the LabOps Guardian Rasa coworker.

Checks: Python version, API keys (.env), Python deps, project files, demo audio,
external services (Speechmatics, Rime, Nebius), and running services at demo time
(Rasa, action server, and the LabOps API).

Run:  make verify     (or: python scripts/verify_setup.py)
"""

from __future__ import annotations

import asyncio
import importlib.util
import os
import sys
from glob import glob
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

GREEN, YELLOW, RED, BLUE, MAGENTA, BOLD, DIM, RESET = (
    "\033[92m", "\033[93m", "\033[91m", "\033[94m", "\033[95m", "\033[1m", "\033[2m", "\033[0m"
)


def ok(m: str) -> None:   print(f"{GREEN}  ✓  {m}{RESET}")
def warn(m: str) -> None: print(f"{YELLOW}  ⚠  {m}{RESET}")
def fail(m: str) -> None: print(f"{RED}  ✗  {m}{RESET}")
def hint(m: str) -> None: print(f"{DIM}       → {m}{RESET}")


def section(t: str) -> None:
    print(f"\n{BLUE}{BOLD}{'-' * 60}{RESET}")
    print(f"{BLUE}{BOLD}  {t}{RESET}")
    print(f"{BLUE}{BOLD}{'-' * 60}{RESET}")


def check_python() -> bool:
    v = sys.version_info
    if v.major == 3 and v.minor in (10, 11):
        ok(f"Python {v.major}.{v.minor}.{v.micro}")
        return True
    fail(f"Python {v.major}.{v.minor} — requires 3.10 or 3.11 (Rasa constraint)")
    hint("pyenv install 3.11 && pyenv local 3.11")
    return False


def check_key(name: str, label: str) -> bool:
    val = os.getenv(name, "").strip()
    if val and not val.lower().startswith("your-"):
        masked = f"{val[:4]}...{val[-4:]}" if len(val) > 8 else "***"
        ok(f"{label}  {DIM}({name}={masked}){RESET}")
        return True
    fail(f"{label} not set  ({name})")
    hint(f"Add {name}=... to your .env (copy from .env.example)")
    return False


def check_module(module: str, label: str, required: bool = True) -> bool:
    if importlib.util.find_spec(module) is not None:
        ok(label)
        return True
    if required:
        fail(f"{label}  ({module}) not installed")
        hint("Run: make install")
    else:
        warn(f"{label}  ({module}) not installed — optional")
    return not required


def check_file(path: str) -> bool:
    if Path(path).exists():
        ok(path)
        return True
    fail(f"{path} not found")
    return False


def check_audio() -> bool:
    clips = sorted(glob("voice/audio/user_*.wav"))
    if clips:
        ok(f"Demo audio present  {DIM}({len(clips)} clips){RESET}")
        return True
    warn("No demo audio yet (voice loop needs it; text mode does not)")
    hint("Run: make generate-audio")
    return False


async def _post(session, name, url, **kw):
    import aiohttp
    try:
        async with session.post(url, timeout=aiohttp.ClientTimeout(total=20), **kw) as r:
            if r.status == 200:
                ok(f"{name} reachable (key valid)")
                return True
            fail(f"{name} returned HTTP {r.status}")
            hint((await r.text())[:120])
            return False
    except Exception as exc:  # noqa: BLE001
        fail(f"{name} unreachable: {exc}")
        return False


async def _get(session, name, url, warn_on_fail=False):
    import aiohttp
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as r:
            ok(f"{name} (HTTP {r.status})")
            return True
    except Exception:
        (warn if warn_on_fail else fail)(f"{name} not reachable")
        return not warn_on_fail


async def run() -> int:
    print(f"\n{BOLD}{BLUE}{'=' * 60}{RESET}")
    print(f"{BOLD}{BLUE}  \U0001F9EA  LabOps Guardian — Pre-flight Diagnostics{RESET}")
    print(f"{BOLD}{BLUE}{'=' * 60}{RESET}")

    errors = warnings = 0

    section("Python Environment")
    if not check_python():
        errors += 1

    section("API Keys (.env)")
    for n, l in [
        ("RASA_PRO_LICENSE", "Rasa Pro license"),
        ("NEBIUS_API_KEY", "Nebius Token Factory (LLM inference)"),
        ("SPEECHMATICS_API_KEY", "Speechmatics (ASR + TTS)"),
        ("RIME_API_KEY", "Rime (agent voice)"),
    ]:
        if not check_key(n, l):
            errors += 1

    section("Python Dependencies")
    for m, l in [("rasa", "Rasa Pro"), ("rasa_sdk", "Rasa SDK"), ("requests", "requests"),
                 ("aiohttp", "aiohttp"), ("dotenv", "python-dotenv"), ("rich", "rich"),
                 ("speechmatics", "speechmatics-python")]:
        if not check_module(m, l):
            errors += 1
    for m, l in [("pydub", "pydub (audio playback)"), ("simpleaudio", "simpleaudio (playback)")]:
        if not check_module(m, l, required=False):
            warnings += 1

    section("Project Files")
    for f in ["config.yml", "domain/shared.yml", "data/flows/sample_move.yml",
              "data/flows/validate_calculation.yml", "actions/actions.py", ".env"]:
        if not check_file(f):
            errors += 1

    section("Demo Audio Files")
    if not check_audio():
        warnings += 1

    nebius = os.getenv("NEBIUS_API_KEY", "").strip()
    sm = os.getenv("SPEECHMATICS_API_KEY", "").strip()
    rime = os.getenv("RIME_API_KEY", "").strip()
    labops = os.getenv("LABOPS_API_URL", "http://localhost:8000").strip().rstrip("/")

    section("External Service Connectivity")
    import aiohttp
    async with aiohttp.ClientSession() as s:
        if sm:
            if not await _post(s, "Speechmatics TTS",
                               "https://preview.tts.speechmatics.com/generate/theo",
                               headers={"Authorization": f"Bearer {sm}"},
                               params={"output_format": "wav_16000"}, json={"text": "Test."}):
                errors += 1
        else:
            warn("Speechmatics: skipped (no key)")
        if rime:
            if not await _post(s, "Rime TTS", "https://users.rime.ai/v1/rime-tts",
                               headers={"Authorization": f"Bearer {rime}"},
                               json={"text": "Test.", "speaker": "cove", "modelId": "mistv2"}):
                errors += 1
        else:
            warn("Rime: skipped (no key)")
        if nebius:
            if not await _post(s, "Nebius Token Factory",
                               "https://api.tokenfactory.nebius.com/v1/chat/completions",
                               headers={"Authorization": f"Bearer {nebius}"},
                               json={"model": "Qwen/Qwen3-235B-A22B-Instruct-2507",
                                     "messages": [{"role": "user", "content": "ping"}],
                                     "max_tokens": 1}):
                errors += 1
                hint("Copy the exact model id/region from your Nebius console into endpoints.yml")
        else:
            warn("Nebius: skipped (no key)")

        section("Running Services (start these at demo time)")
        if not await _get(s, f"LabOps API ({labops}) — see ../labops_api",
                          f"{labops}/", warn_on_fail=True):
            warnings += 1
        if not await _get(s, "Rasa server :5005 (make run-rasa)",
                          "http://localhost:5005/", warn_on_fail=True):
            warnings += 1
        if not await _get(s, "Action server :5055 (make run-actions)",
                          "http://localhost:5055/health", warn_on_fail=True):
            warnings += 1

    print(f"\n{BOLD}{'=' * 60}{RESET}")
    if errors == 0 and warnings == 0:
        print(f"{GREEN}{BOLD}✓  All checks passed — ready to demo!{RESET}")
    elif errors == 0:
        print(f"{YELLOW}{BOLD}⚠  Ready, with {warnings} warning(s) above.{RESET}")
        print(f"{YELLOW}  (Running-service warnings are expected before you start them.){RESET}")
    else:
        print(f"{RED}{BOLD}✗  {errors} error(s) — fix these first.{RESET}")
        print(f"\n  {BLUE}Common fixes:{RESET}")
        print(f"    {GREEN}cp .env.example .env{RESET}   then paste your keys")
        print(f"    {GREEN}make install{RESET}           install dependencies")

    print(f"\n  {MAGENTA}Then run (3 terminals, plus the LabOps API):{RESET}")
    print(f"    {GREEN}make run-actions{RESET}  |  {GREEN}make run-rasa{RESET}  |  "
          f"{GREEN}make demo-text{RESET}\n")
    return 0 if errors == 0 else 1


def main() -> None:
    sys.exit(asyncio.run(run()))


if __name__ == "__main__":
    main()
