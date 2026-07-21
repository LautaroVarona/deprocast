export default function SaludLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden">{children}</div>;
}
