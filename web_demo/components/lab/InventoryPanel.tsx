"use client";

import Panel from "@/components/shared/Panel";
import Badge from "@/components/shared/Badge";
import { useLabStore } from "@/store/labStore";
import type { Confidence } from "@/types/lab";

function confTone(c?: Confidence) {
  return c === "high" ? "ok" : c === "medium" ? "warn" : "crit";
}

export default function InventoryPanel() {
  const inventory = useLabStore((s) => s.inventory);
  const inventoryList = useLabStore((s) => s.inventoryList);

  return (
    <Panel title="Inventory">
      {/* Highlighted lookup result (the simulated shelf counter) */}
      {inventory && (
        <div style={{ marginBottom: inventoryList.length ? 12 : 0 }}>
          <div className="inv-name">{inventory.item_name}</div>
          <div className="inv-loc">Inventory record: {inventory.official_location}</div>
          <div className="inv-meta">
            <Badge tone="info">
              sim camera: {inventory.visible_count} {inventory.unit}
            </Badge>
            <Badge tone={confTone(inventory.confidence)}>confidence {inventory.confidence}</Badge>
            <Badge>{inventory.source_type}</Badge>
          </div>
          {inventory.human_confirmation_required && (
            <div className="inv-note">
              Simulated shelf counter — not real object detection. Human confirmation recommended.
            </div>
          )}
        </div>
      )}

      {/* Full live inventory from the backend (/api/state) */}
      {inventoryList.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {inventoryList.map((it) => {
            const count = it.camera_inferred_count ?? it.record_count;
            return (
              <div key={it.item_name}>
                <div className="inv-name" style={{ fontSize: 13 }}>{it.item_name}</div>
                <div className="inv-loc">{it.location}</div>
                <div className="inv-meta">
                  {count != null && (
                    <Badge tone="info">
                      {count}{it.camera_inferred_count != null ? " (sim)" : ""}
                    </Badge>
                  )}
                  {it.stock_level && (
                    <Badge tone={it.stock_level === "low" ? "warn" : "ok"}>{it.stock_level}</Badge>
                  )}
                  <Badge tone={confTone(it.confidence)}>conf {it.confidence}</Badge>
                  <Badge>{it.source_type}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !inventory && (
          <p style={{ color: "var(--dim)", fontSize: 13, margin: 0 }}>
            No inventory loaded. Connect the backend, or click “Find 15 mL tubes.”
          </p>
        )
      )}
    </Panel>
  );
}
