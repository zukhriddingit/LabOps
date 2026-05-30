type Tone = "default" | "ok" | "info" | "warn" | "crit";

export default function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  const cls = tone === "default" ? "badge" : `badge ${tone}`;
  return <span className={cls}>{children}</span>;
}
