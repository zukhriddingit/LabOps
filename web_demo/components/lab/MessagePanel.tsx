"use client";

import Panel from "@/components/shared/Panel";
import Badge from "@/components/shared/Badge";
import { useLabStore } from "@/store/labStore";

export default function MessagePanel() {
  const messageStatus = useLabStore((s) => s.messageStatus);
  const messageDraft = useLabStore((s) => s.messageDraft);

  return (
    <Panel title="PI / Postdoc Message">
      <div className="row">
        <span>Status</span>
        <span className="val">
          <Badge tone={messageStatus === "sent" ? "ok" : messageStatus === "draft" ? "info" : "default"}>
            {messageStatus === "none" ? "no message" : messageStatus}
          </Badge>
        </span>
      </div>
      {messageDraft && (
        <div className="msg-draft">
          <strong>Draft → postdoc:</strong> {messageDraft}
          <div style={{ marginTop: 6, color: "var(--dim)", fontSize: 12 }}>
            Sent with confirmed=false (draft only). Confirm in the voice/text agent to send.
          </div>
        </div>
      )}
    </Panel>
  );
}
