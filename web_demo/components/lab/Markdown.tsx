"use client";

import { Fragment, type ReactNode } from "react";

// Tiny, dependency-free markdown renderer for the chat bubbles. Handles the subset
// the agent actually emits: **bold**, *italic*/_italic_, `code`, bullet & numbered
// lists, headings, and line breaks. Renders real React nodes (no dangerouslySetInnerHTML).

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|(?:^|\b)_([^_]+)_(?=\b|$))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2] != null) out.push(<strong key={`${keyBase}-${i++}`}>{m[2]}</strong>);
    else if (m[3] != null) out.push(<code key={`${keyBase}-${i++}`} className="md-code">{m[3]}</code>);
    else if (m[4] != null) out.push(<em key={`${keyBase}-${i++}`}>{m[4]}</em>);
    else if (m[5] != null) out.push(<em key={`${keyBase}-${i++}`}>{m[5]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = (text ?? "").split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let k = 0;

  const flush = () => {
    if (!list) return;
    const items = list.items.map((it, idx) => <li key={idx}>{renderInline(it, `li-${k}-${idx}`)}</li>);
    blocks.push(list.ordered ? <ol key={`b-${k++}`} className="md-ol">{items}</ol> : <ul key={`b-${k++}`} className="md-ul">{items}</ul>);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.*)$/);

    if (bullet) {
      if (!list || list.ordered) { flush(); list = { ordered: false, items: [] }; }
      list.items.push(bullet[1]);
    } else if (numbered) {
      if (!list || !list.ordered) { flush(); list = { ordered: true, items: [] }; }
      list.items.push(numbered[1]);
    } else if (heading) {
      flush();
      blocks.push(<p key={`b-${k++}`} className="md-h"><strong>{renderInline(heading[1], `h-${k}`)}</strong></p>);
    } else if (line.trim() === "") {
      flush();
    } else {
      flush();
      blocks.push(<p key={`b-${k++}`} className="md-p">{renderInline(line, `p-${k}`)}</p>);
    }
  }
  flush();

  return <div className={className}>{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
