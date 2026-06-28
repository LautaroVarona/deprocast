export default function LudusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ludus-noir-root castillo-dot-grid min-h-[calc(100dvh-3.5rem)] overflow-y-auto">
      {children}
    </div>
  );
}
