from __future__ import annotations

import asyncio
import json
import os
from typing import Any, Dict

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel


app = FastAPI(title="LabOps Guardian Voice Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TTSRequest(BaseModel):
    text: str


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "speechmatics_configured": bool(env("SPEECHMATICS_API_KEY")),
        "rime_configured": bool(env("RIME_API_KEY")),
    }


@app.post("/api/transcribe")
async def transcribe(audio: UploadFile = File(...)) -> Dict[str, Any]:
    api_key = env("SPEECHMATICS_API_KEY")
    base_url = env("SPEECHMATICS_BASE_URL", "https://asr.api.speechmatics.com/v2").rstrip("/")
    language = env("SPEECHMATICS_LANGUAGE", "en")
    if not api_key:
        raise HTTPException(status_code=503, detail="Speechmatics is not configured. Set SPEECHMATICS_API_KEY.")

    config = {
        "type": "transcription",
        "transcription_config": {
            "language": language,
            "operating_point": "enhanced",
        },
    }
    files = {
        "config": (None, json.dumps(config), "application/json"),
        "data_file": (audio.filename or "speech.webm", await audio.read(), audio.content_type or "audio/webm"),
    }
    headers = {"Authorization": f"Bearer {api_key}"}

    async with httpx.AsyncClient(timeout=60) as client:
        create = await client.post(f"{base_url}/jobs", headers=headers, files=files)
        create.raise_for_status()
        job_id = create.json().get("id")
        if not job_id:
            raise HTTPException(status_code=502, detail="Speechmatics did not return a job id.")

        for _ in range(60):
            status = await client.get(f"{base_url}/jobs/{job_id}", headers=headers)
            status.raise_for_status()
            job = status.json().get("job", status.json())
            if job.get("status") == "done":
                transcript = await client.get(f"{base_url}/jobs/{job_id}/transcript?format=txt", headers=headers)
                transcript.raise_for_status()
                return {"text": transcript.text.strip(), "provider": "speechmatics", "job_id": job_id}
            if job.get("status") in {"rejected", "deleted", "expired"}:
                raise HTTPException(status_code=502, detail=f"Speechmatics job ended with status {job.get('status')}.")
            await asyncio.sleep(1)

    raise HTTPException(status_code=504, detail="Speechmatics transcription timed out.")


@app.post("/api/tts")
async def tts(request: TTSRequest) -> Response:
    api_key = env("RIME_API_KEY")
    api_url = env("RIME_API_URL", "https://users.rime.ai/v1/rime-tts")
    if not api_key:
        raise HTTPException(status_code=503, detail="Rime is not configured. Set RIME_API_KEY.")

    payload = {
        "text": request.text,
        "modelId": env("RIME_MODEL_ID", "mistv2"),
        "speaker": env("RIME_SPEAKER", "astra"),
        "lang": "eng",
        "samplingRate": 22050,
        "speedAlpha": 1.0,
    }
    headers = {
        "Accept": "audio/mp3",
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(api_url, headers=headers, json=payload)
        response.raise_for_status()
        return Response(content=response.content, media_type=response.headers.get("content-type", "audio/mpeg"))
