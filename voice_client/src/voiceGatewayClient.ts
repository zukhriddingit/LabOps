const VOICE_GATEWAY_URL = import.meta.env.VITE_VOICE_GATEWAY_URL ?? "http://localhost:8010";

export async function transcribeWithSpeechmatics(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "labops-command.webm");

  const response = await fetch(`${VOICE_GATEWAY_URL}/api/transcribe`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body.detail ?? `HTTP ${response.status}`;
    console.error("[LabOps] Speechmatics backend error:", detail);
    throw new Error(detail);
  }

  const data = await response.json();
  return data.text ?? "";
}

export async function speakWithRime(text: string): Promise<void> {
  const response = await fetch(`${VOICE_GATEWAY_URL}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Voice gateway TTS returned HTTP ${response.status}`);
  }

  const audioBlob = await response.blob();
  const url = URL.createObjectURL(audioBlob);
  const audio = new Audio(url);
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
  await audio.play();
}
