export default function LudusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ludus-noir-root castillo-dot-grid flex min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
