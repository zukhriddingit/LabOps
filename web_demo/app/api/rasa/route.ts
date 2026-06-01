import { NextResponse } from "next/server";

const RASA_URL =
  process.env.GUARDIAN_CHAT_URL ??
  process.env.NEXT_PUBLIC_GUARDIAN_CHAT_URL ??
  process.env.RASA_REST_URL ??
  process.env.NEXT_PUBLIC_RASA_REST_URL ??
  "http://127.0.0.1:8000/api/chat";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const sender = typeof body?.sender === "string" ? body.sender : "web_demo";

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const upstream = await fetch(RASA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ sender, message }),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Rasa returned HTTP ${upstream.status}` },
        { status: 502 }
      );
    }

    const replies = await upstream.json();
    return NextResponse.json({ replies: Array.isArray(replies) ? replies : [] });
  } catch {
    return NextResponse.json(
      { error: "Guardian chat backend is not reachable. Start Docker compose or the LabOps backend." },
      { status: 503 }
    );
  }
}
