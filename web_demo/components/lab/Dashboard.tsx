"use client";

import StatusPanel from "./StatusPanel";
import InventoryPanel from "./InventoryPanel";
import MessagePanel from "./MessagePanel";
import DemoControls from "./DemoControls";
import TranscriptPanel from "./TranscriptPanel";
import TimelinePanel from "./TimelinePanel";
import { useLabStore } from "@/store/labStore";

export default function Dashboard() {
  const open = useLabStore((s) => s.dashboardOpen);
  const toggleDashboard = useLabStore((s) => s.toggleDashboard);

  return (
    <aside className={`dashboard ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="dashboard-head">
        <h2>Dashboard</h2>
        <button className="info-close" onClick={() => toggleDashboard(false)} aria-label="Close dashboard">
          ×
        </button>
      </div>
      <div className="dashboard-body">
        <StatusPanel />
        <DemoControls />
        <TimelinePanel />
        <InventoryPanel />
        <MessagePanel />
        <TranscriptPanel />
      </div>
    </aside>
  );
}
