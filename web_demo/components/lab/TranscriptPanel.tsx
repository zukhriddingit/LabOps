"use client";

import { useLabStore } from "@/store/labStore";

export default function TranscriptPanel() {
  const transcript = useLabStore((s) => s.transcript);
  const shown = useLabStore((s) => s.transcriptShown);
  const advance = useLabStore((s) => s.advanceTranscript);
  const reset = useLabStore((s) => s.reset);

  return (
    <footer className="transcript">
      <div className="transcript-head">
        <h3>Transcript</h3>
        <div>
          <button className="btn small" onClick={advance} disabled={shown >= transcript.length}>
            Advance ▸
          </button>
          <button className="btn small ghost" onClick={reset}>
            Reset
          </button>
        </div>
      </div>
      <div className="lines">
        {transcript.slice(0, shown).map((l, i) => (
          <div key={i} className={`line ${l.who}`}>
            <span className="speaker">{l.who === "human" ? "🧪 Researcher" : "🤖 Guardian"}</span>
            <span className="text">{l.text}</span>
          </div>
        ))}
      </div>
    </footer>
  );
}
