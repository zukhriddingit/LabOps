from __future__ import annotations

import asyncio
import json
import os
from typing import Any, Dict

import httpx
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

app = FastAPI(title="LabOps Guardian Voice Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Ensure CORS headers appear on error responses too (Safari requires this)
@app.exception_handler(Exception)
async def _cors_safe_error(request: Request, exc: Exception) -> JSONResponse:
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
    status = exc.status_code if isinstance(exc, HTTPException) else 500
    detail = exc.detail if isinstance(exc, HTTPException) else str(exc)
    return JSONResponse(status_code=status, content={"detail": detail}, headers=headers)


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
        raise HTTPException(status_code=503, detail="Speechmatics not configured.")

    audio_bytes = await audio.read()
    content_type = audio.content_type or "audio/webm"
    filename = audio.filename or f"audio.{content_type.split('/')[-1].split(';')[0]}"
    print(f"[transcribe] received {len(audio_bytes)} bytes, content-type={content_type}, filename={filename}")

    config = {
        "type": "transcription",
        "transcription_config": {"language": language, "operating_point": "enhanced"},
    }
    files = {
        "config": (None, json.dumps(config), "application/json"),
        "data_file": (filename, audio_bytes, content_type),
    }
    headers = {"Authorization": f"Bearer {api_key}"}

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            create = await client.post(f"{base_url}/jobs", headers=headers, files=files)
            if not create.is_success:
                raise HTTPException(
                    status_code=502,
                    detail=f"Speechmatics job creation failed: {create.status_code} — {create.text[:200]}",
                )

            job_id = create.json().get("id")
            if not job_id:
                raise HTTPException(status_code=502, detail="Speechmatics did not return a job id.")

            for _ in range(60):
                poll = await client.get(f"{base_url}/jobs/{job_id}", headers=headers)
                if not poll.is_success:
                    raise HTTPException(status_code=502, detail=f"Speechmatics poll failed: {poll.status_code}")
                job = poll.json().get("job", poll.json())
                if job.get("status") == "done":
                    result = await client.get(
                        f"{base_url}/jobs/{job_id}/transcript?format=txt", headers=headers
                    )
                    return {"text": result.text.strip(), "provider": "speechmatics", "job_id": job_id}
                if job.get("status") in {"rejected", "deleted", "expired"}:
                    raise HTTPException(
                        status_code=502,
                        detail=f"Speechmatics job {job_id} ended with status: {job.get('status')}",
                    )
                await asyncio.sleep(1)

        raise HTTPException(status_code=504, detail="Speechmatics transcription timed out after 60s.")

    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Speechmatics request timed out.")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Cannot reach Speechmatics: {exc}")


@app.post("/api/tts")
async def tts(request: TTSRequest) -> Response:
    api_key = env("RIME_API_KEY")
    api_url = env("RIME_API_URL", "https://users.rime.ai/v1/rime-tts")

    if not api_key:
        raise HTTPException(status_code=503, detail="Rime not configured.")

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

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(api_url, headers=headers, json=payload)
            if not response.is_success:
                raise HTTPException(
                    status_code=502,
                    detail=f"Rime TTS failed: {response.status_code} — {response.text[:200]}",
                )
            return Response(
                content=response.content,
                media_type=response.headers.get("content-type", "audio/mpeg"),
            )
    except HTTPException:
        raise
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Cannot reach Rime: {exc}")
