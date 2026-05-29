import { useState } from "react";

interface Line {
  who: "human" | "agent";
  text: string;
}

// Mirrors starter/voice/script.py — the scripted demo conversation.
const SCRIPT: Line[] = [
  { who: "human", text: "Guardian, I'm taking Cardio Sample C17 out of minus 60 and putting it on Bench 2. It can stay at room temperature for 20 minutes." },
  { who: "agent", text: "Logged — C17 is on Bench 2. I'll remind you shortly before the limit and escalate at 20 minutes. (user-reported)" },
  { who: "human", text: "I calculated 20 microliters for 0.02 percent in 100 mL. Is that correct?" },
  { who: "agent", text: "Correct, assuming v/v: 0.02 / 100 × 100 mL = 0.02 mL = 20 µL. If it's w/v or stock-based, I need the stock concentration. (calculated)" },
  { who: "human", text: "Where are the 15 mL tubes?" },
  { who: "agent", text: "Inventory record: Shelf A, bin 3. The count is camera-inferred (2 boxes), confidence medium. (camera-inferred)" },
  { who: "human", text: "What centrifuge setup applies for this tissue sample?" },
  { who: "agent", text: "Based on the local SOP, the match is Cardiovascular Tissue Prep v2. Confirm rotor type before running. (sop-grounded)" },
  { who: "agent", text: "C17 has been at room temperature for 18 minutes — limit is 20. Please move it back or continue. (reminder)" },
  { who: "human", text: "My gloves are contaminated. Message the postdoc." },
  { who: "agent", text: "Draft to the postdoc: \"C17 is at 18 minutes room temp on Bench 2. Assistance needed before the 20-minute limit.\" Confirm send? (pending confirmation)" },
  { who: "human", text: "Yes, send it." },
  { who: "agent", text: "Sent to the postdoc. (human-confirmed)" },
  { who: "human", text: "Give the night shift a handoff." },
  { who: "agent", text: "Handoff — C17 removed from Freezer B → Bench 2; reagent calc verified (v/v); 15 mL tubes on Shelf A bin 3; centrifuge SOP v2 retrieved; postdoc notified. Root cause/outcome not yet confirmed." },
];

export default function TranscriptPanel() {
  const [shown, setShown] = useState(2);
  const visible = SCRIPT.slice(0, shown);

  return (
    <footer className="transcript">
      <div className="transcript-head">
        <h3>Transcript</h3>
        <div>
          <button className="btn small" onClick={() => setShown((n) => Math.min(SCRIPT.length, n + 1))}>
            Advance ▸
          </button>
          <button className="btn small ghost" onClick={() => setShown(2)}>
            Restart
          </button>
        </div>
      </div>
      <div className="lines">
        {visible.map((l, i) => (
          <div key={i} className={`line ${l.who}`}>
            <span className="speaker">{l.who === "human" ? "🧪 Researcher" : "🤖 Guardian"}</span>
            <span className="text">{l.text}</span>
          </div>
        ))}
      </div>
    </footer>
  );
}
