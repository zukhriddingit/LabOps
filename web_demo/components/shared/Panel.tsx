export default function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel ${className ?? ""}`}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
