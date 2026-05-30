export type RasaMessage = {
  recipient_id?: string;
  text?: string;
  image?: string;
  buttons?: Array<{ title: string; payload: string }>;
};

const RASA_URL = import.meta.env.VITE_RASA_REST_URL ?? "http://localhost:8000/api/chat";

export async function sendToRasa(message: string, sender = "labops_voice_user"): Promise<RasaMessage[]> {
  const response = await fetch(RASA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sender, message }),
  });

  if (!response.ok) {
    throw new Error(`Rasa REST returned HTTP ${response.status}`);
  }

  return response.json();
}
