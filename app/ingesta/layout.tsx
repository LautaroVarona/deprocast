export default function IngestaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[calc(100dvh-3.5rem)] overflow-hidden flex flex-col">
      {children}
    </div>
  );
}
