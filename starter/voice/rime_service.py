"""Rime TTS — the showcased agent voice.

Rime ships ultra-low-latency, natural voices. We use it for the *agent's* spoken
replies. Want a free, self-hosted alternative? Neuphonic's NeuTTS runs locally:
https://github.com/neuphonic/neutts — drop-in replace `synthesize()` and you're off.
"""

from __future__ import annotations

import base64
import os

import aiohttp

RIME_URL = "https://users.rime.ai/v1/rime-tts"
MODEL_ID = "mistv2"
DEFAULT_SPEAKER = "cove"  # calm, professional. Browse more at https://rime.ai


class RimeError(Exception):
    pass


class RimeTTS:
    def __init__(self) -> None:
        self.api_key = os.environ.get("RIME_API_KEY", "").strip()
        if not self.api_key:
            raise RimeError("RIME_API_KEY is not set (see .env).")

    async def synthesize(self, text: str, speaker: str = DEFAULT_SPEAKER) -> bytes:
        if not text.strip():
            raise RimeError("Cannot synthesize empty text.")
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {
            "text": text,
            "speaker": speaker,
            "modelId": MODEL_ID,
            "speedAlpha": 1.0,
            "reduceLatency": True,
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(
                RIME_URL, json=payload, headers=headers,
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    raise RimeError(f"Rime HTTP {resp.status}: {body[:200]}")
                data = await resp.json()
        if "audioContent" not in data:
            raise RimeError(f"Rime response missing audioContent. Keys: {list(data)}")
        return base64.b64decode(data["audioContent"])
