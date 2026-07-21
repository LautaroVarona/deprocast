export default function FinanzasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-[calc(100dvh-3.5rem)]">{children}</div>;
}
