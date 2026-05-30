"use client";

import { useEffect, useRef, useState } from "react";
import { useLabStore } from "@/store/labStore";
import {
  createRecognizer,
  recognitionSupported,
  speak,
  cancelSpeak,
  warmUpVoices,
  type Recognizer,
} from "@/lib/speech";
import Markdown from "./Markdown";

export default function VoicePanel() {
  const voiceLog = useLabStore((s) => s.voiceLog);
  const listening = useLabStore((s) => s.listening);
  const voiceBrain = useLabStore((s) => s.voiceBrain);
  const setListening = useLabStore((s) => s.setListening);
  const runVoiceCommand = useLabStore((s) => s.runVoiceCommand);

  const [open, setOpen] = useState(true);
  const [supported, setSupported] = useState(false);
  const [partial, setPartial] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState("");
  const recRef = useRef<Recognizer | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSupported(recognitionSupported());
    warmUpVoices();
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [voiceLog, partial]);

  async function handle(text: string) {
    setPartial("");
    const reply = await runVoiceCommand(text);
    if (reply && !muted) {
      setSpeaking(true);
      speak(reply, () => setSpeaking(false));
    }
  }

  function startListening() {
    cancelSpeak();
    setSpeaking(false);
    let gotResult = false;
    const rec = createRecognizer({
      onPartial: (t) => {
        gotResult = true;
        setPartial(t);
      },
      onFinal: (t) => {
        gotResult = true;
        recRef.current = null;
        setListening(false);
        setStatus("");
        handle(t);
      },
      onEnd: () => {
        setListening(false);
        setPartial("");
        setStatus((s) => (gotResult ? "" : s || "Didn't catch that — tap and speak again."));
      },
      onError: (err) => {
        setListening(false);
        setPartial("");
        setStatus(
          err === "not-allowed" || err === "service-not-allowed"
            ? "Microphone blocked. Allow mic access in the browser address bar, then tap again."
            : err === "no-speech"
              ? "Didn't catch that — tap and speak again."
              : err === "audio-capture"
                ? "No microphone found."
                : err === "aborted"
                  ? ""
                  : `Voice error: ${err}`
        );
      },
    });
    if (!rec) {
      setStatus("Voice input isn't available in this browser — type instead.");
      return;
    }
    recRef.current = rec;
    setStatus("Listening… speak now.");
    setListening(true);
    rec.start();
  }

  function stopListening() {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
    setStatus("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = typed.trim();
    if (!text) return;
    setTyped("");
    handle(text);
  }

  if (!open) {
    return (
      <button className="voice-fab" onClick={() => setOpen(true)} title="Talk to Guardian">
        🎙
      </button>
    );
  }

  return (
    <div className="voice-dock">
      <div className="voice-head">
        <span className="voice-title">
          🎙 Guardian Voice {speaking && <span className="voice-speaking">speaking…</span>}
        </span>
        <span className={`voice-brain ${voiceBrain}`}>
          {voiceBrain === "rasa" ? "Qwen backend" : voiceBrain === "local" ? "Local fallback" : "Brain checking"}
        </span>
        <div className="voice-head-btns">
          <button
            className={`voice-mini ${muted ? "on" : ""}`}
            onClick={() => {
              cancelSpeak();
              setSpeaking(false);
              setMuted((m) => !m);
            }}
            title={muted ? "Unmute replies" : "Mute replies"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button className="voice-mini" onClick={() => setOpen(false)} title="Hide">
            ×
          </button>
        </div>
      </div>

      <div className="voice-log" ref={logRef}>
        {voiceLog.length === 0 && (
          <div className="voice-hint">
            Ask me anything. Try “move C17 to the bench”, “where are the 15 mL tubes”, “is 20
            microliters right for 0.02 percent in 100 mL”, or “message the postdoc”.
          </div>
        )}
        {voiceLog.map((l, i) => (
          <div key={i} className={`voice-line ${l.who}`}>
            <span className="who">{l.who === "human" ? "You" : "Guardian"}</span>
            {l.who === "agent" ? (
              <Markdown text={l.text} className="txt md" />
            ) : (
              <span className="txt">{l.text}</span>
            )}
          </div>
        ))}
        {partial && <div className="voice-partial">{partial}…</div>}
      </div>

      <div className="voice-row">
        {supported ? (
          <button
            className={`mic-btn ${listening ? "live" : ""}`}
            onClick={listening ? stopListening : startListening}
          >
            {listening ? "● Listening — tap to stop" : "🎙 Hold a thought — tap to talk"}
          </button>
        ) : (
          <span className="voice-nomic">Voice input needs Chrome/Edge — type below.</span>
        )}
        <form className="voice-form" onSubmit={onSubmit}>
          <input
            className="voice-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="…or type a command"
          />
          <button className="voice-send" type="submit">
            Send
          </button>
        </form>
        {status && <div className="voice-status">{status}</div>}
      </div>
    </div>
  );
}
