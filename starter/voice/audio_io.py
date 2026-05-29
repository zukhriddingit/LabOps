"""Audio playback helper. Plays WAV bytes; degrades gracefully if audio libs/ffmpeg
are not available (so the demo still runs in --text mode anywhere)."""

from __future__ import annotations

import io
import logging

logger = logging.getLogger(__name__)


def play_wav_bytes(audio: bytes) -> None:
    try:
        from pydub import AudioSegment
        from pydub.playback import play

        play(AudioSegment.from_file(io.BytesIO(audio), format="wav"))
    except Exception as exc:  # noqa: BLE001
        logger.warning("Audio playback unavailable (%s). Install ffmpeg + simpleaudio, "
                       "or use --text mode.", exc)
