"use client";

import Panel from "@/components/shared/Panel";
import Badge from "@/components/shared/Badge";
import { useLabStore } from "@/store/labStore";

export default function InventoryPanel() {
  const inventory = useLabStore((s) => s.inventory);

  return (
    <Panel title="Inventory">
      {!inventory ? (
        <p style={{ color: "var(--dim)", fontSize: 13, margin: 0 }}>
          No lookup yet. Click “Find 15 mL tubes.”
        </p>
      ) : (
        <>
          <div className="inv-name">{inventory.item_name}</div>
          <div className="inv-loc">Inventory record: {inventory.official_location}</div>
          <div className="inv-meta">
            <Badge tone="info">
              sim camera: {inventory.visible_count} {inventory.unit}
            </Badge>
            <Badge tone={inventory.confidence === "high" ? "ok" : inventory.confidence === "medium" ? "warn" : "crit"}>
              confidence {inventory.confidence}
            </Badge>
            <Badge>{inventory.source_type}</Badge>
          </div>
          {inventory.human_confirmation_required && (
            <div className="inv-note">
              Simulated shelf counter — not real object detection. Human confirmation recommended.
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
