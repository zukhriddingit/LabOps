"""Pre-generate the scripted user utterances as 16 kHz WAVs (Speechmatics TTS).

Run once before the voice demo:   make generate-audio
"""

from __future__ import annotations

import asyncio
from pathlib import Path

from dotenv import load_dotenv

from voice.script import USER_TURNS
from voice.speechmatics_service import SpeechmaticsService

load_dotenv()
OUT_DIR = Path("voice/audio")


async def _main() -> None:
    tts = SpeechmaticsService()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Generating {len(USER_TURNS)} user clips -> {OUT_DIR}/")
    for i, line in enumerate(USER_TURNS, start=1):
        audio = await tts.synthesize(line, role="user")
        path = OUT_DIR / f"user_{i}.wav"
        path.write_bytes(audio)
        print(f"  user_{i}.wav  ({len(audio):,} bytes)  {line!r}")
    print("Done. Now run: make demo")


def main() -> None:
    asyncio.run(_main())


if __name__ == "__main__":
    main()
