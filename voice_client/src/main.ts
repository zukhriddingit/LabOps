import { sendToRasa } from "./rasaRestClient";
import { speakWithRime, transcribeWithSpeechmatics } from "./voiceGatewayClient";
import "./style.css";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  addEventListener: (type: string, listener: (event: any) => void) => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const talkButton = document.querySelector<HTMLButtonElement>("#talkButton")!;
const textForm = document.querySelector<HTMLFormElement>("#textForm")!;
const textInput = document.querySelector<HTMLInputElement>("#textInput")!;
const messages = document.querySelector<HTMLDivElement>("#messages")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let recording = false;

function addMessage(role: "worker" | "guardian", text: string) {
  const row = document.createElement("div");
  row.className = `message ${role}`;
  row.innerHTML = `<strong>${role === "worker" ? "Worker" : "Guardian"}</strong><span></span>`;
  row.querySelector("span")!.textContent = text;
  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.98;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

async function speakAssistant(text: string) {
  try {
    await speakWithRime(text);
  } catch {
    speak(text);
  }
}

async function submit(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  addMessage("worker", trimmed);
  textInput.value = "";
  status.textContent = "Sending to Guardian...";

  try {
    const replies = await sendToRasa(trimmed);
    if (!replies.length) {
      addMessage("guardian", "I did not get a response from Guardian.");
      return;
    }
    for (const reply of replies) {
      if (reply.text) {
        addMessage("guardian", reply.text);
        await speakAssistant(reply.text);
      }
    }
  } catch (error) {
    addMessage("guardian", "I cannot reach the Guardian backend. Text is still captured locally.");
  } finally {
    status.textContent = "Ready.";
  }
}

const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

async function startSpeechmaticsRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  chunks = [];
  // Pick the best supported audio format — Safari needs mp4, Firefox prefers ogg
  const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]
    .find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data.size) chunks.push(event.data);
  });
  mediaRecorder.addEventListener("stop", async () => {
    stream.getTracks().forEach((track) => track.stop());
    status.textContent = "Sending audio to Speechmatics...";
    try {
      const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
      const transcript = await transcribeWithSpeechmatics(blob);
      await submit(transcript);
    } catch (err) {
      console.error("[LabOps] Speechmatics error:", err);
      status.textContent = "Speechmatics path failed. Typed input is ready.";
      addMessage("guardian", `Voice failed: ${err instanceof Error ? err.message : String(err)}. Typed input still works.`);
    }
  });
  mediaRecorder.start();
  recording = true;
  talkButton.textContent = "Stop";
  status.textContent = "Recording for Speechmatics...";
}

function stopSpeechmaticsRecording() {
  mediaRecorder?.stop();
  recording = false;
  talkButton.textContent = "Push to Talk";
}

if ("mediaDevices" in navigator && "MediaRecorder" in window) {
  talkButton.addEventListener("click", () => {
    if (recording) {
      stopSpeechmaticsRecording();
      return;
    }
    void startSpeechmaticsRecording();
  });
} else if (Recognition) {
  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = false;

  talkButton.addEventListener("click", () => {
    status.textContent = "Listening...";
    recognition.start();
  });

  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0]?.[0]?.transcript ?? "";
    status.textContent = "Transcribed. Sending...";
    void submit(transcript);
  });

  recognition.addEventListener("error", () => {
    status.textContent = "Voice failed. Typed input is ready.";
  });

  recognition.addEventListener("end", () => {
    if (status.textContent === "Listening...") status.textContent = "Ready.";
  });
} else {
  talkButton.disabled = true;
  status.textContent = "Voice is not available in this browser. Typed input is ready.";
}

textForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void submit(textInput.value);
});
