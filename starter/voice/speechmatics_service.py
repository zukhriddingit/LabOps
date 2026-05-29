"""Speechmatics TTS + ASR.

TTS  : REST call to the Speechmatics preview TTS endpoint -> 16 kHz mono WAV.
ASR  : real-time websocket transcription of WAV bytes.

We keep everything at 16 kHz so the TTS -> ASR round-trip stays consistent.
"""

from __future__ import annotations

import asyncio
import io
import logging
import os

import aiohttp

logger = logging.getLogger(__name__)

TTS_URL = "https://preview.tts.speechmatics.com/generate/{voice}"
ASR_URL = "wss://eu.rt.speechmatics.com/v2"

# Voices used when Speechmatics drives TTS.
VOICE_MAP = {"user": "megan", "agent": "theo"}

WAV_HEADER_BYTES = 44
SAMPLE_RATE = 16_000


class SpeechmaticsError(Exception):
    pass


class SpeechmaticsService:
    def __init__(self) -> None:
        self.api_key = os.environ.get("SPEECHMATICS_API_KEY", "").strip()
        if not self.api_key:
            raise SpeechmaticsError("SPEECHMATICS_API_KEY is not set (see .env).")

    async def synthesize(self, text: str, role: str = "user") -> bytes:
        voice = VOICE_MAP.get(role, "megan")
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        async with aiohttp.ClientSession() as session:
            async with session.post(
                TTS_URL.format(voice=voice),
                json={"text": text},
                headers=headers,
                params={"output_format": "wav_16000"},
                timeout=aiohttp.ClientTimeout(total=60),
            ) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    raise SpeechmaticsError(f"TTS HTTP {resp.status}: {body[:200]}")
                audio = b"".join([c async for c in resp.content.iter_chunked(4096)])
        if len(audio) < WAV_HEADER_BYTES:
            raise SpeechmaticsError("TTS returned a truncated WAV.")
        return audio

    async def transcribe(self, wav_bytes: bytes) -> str:
        """Transcribe 16 kHz PCM-WAV bytes. Returns "" on failure (non-fatal)."""
        import speechmatics  # imported lazily so the package is optional
        import speechmatics.client
        import speechmatics.models

        pcm = wav_bytes[WAV_HEADER_BYTES:]
        if not pcm:
            return ""

        parts: list[str] = []
        ws = speechmatics.client.WebsocketClient(
            speechmatics.models.ConnectionSettings(url=ASR_URL, auth_token=self.api_key)
        )

        def on_transcript(msg: dict) -> None:
            text = msg.get("metadata", {}).get("transcript", "").strip()
            if text:
                parts.append(text)

        ws.add_event_handler(
            event_name=speechmatics.models.ServerMessageType.AddTranscript,
            event_handler=on_transcript,
        )

        audio_settings = speechmatics.models.AudioSettings()
        audio_settings.encoding = "pcm_s16le"
        audio_settings.sample_rate = SAMPLE_RATE
        audio_settings.chunk_size = 1024

        conf = speechmatics.models.TranscriptionConfig(
            language="en", operating_point="enhanced", max_delay=1.0, enable_partials=False
        )

        try:
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: ws.run_synchronously(io.BytesIO(pcm), conf, audio_settings),
            )
        except Exception as exc:  # noqa: BLE001 - ASR failure must not crash the demo
            logger.warning("Speechmatics ASR failed: %s", exc)
            return ""

        return " ".join(parts).strip()
