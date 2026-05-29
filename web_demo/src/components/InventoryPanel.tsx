import type { LabState } from "../types";

export default function InventoryPanel({ state }: { state: LabState }) {
  return (
    <div className="panel">
      <h3>Inventory</h3>
      {state.inventory.map((item) => (
        <div key={item.item_name} className="inv-item">
          <div className="inv-name">{item.item_name}</div>
          <div className="inv-loc">{item.location}</div>
          <div className="inv-meta">
            {item.camera_inferred_count != null && (
              <span className="tag camera">camera: {item.camera_inferred_count} boxes</span>
            )}
            <span className={`tag conf-${item.confidence}`}>confidence {item.confidence}</span>
            <span className="tag src">{item.source_type}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
