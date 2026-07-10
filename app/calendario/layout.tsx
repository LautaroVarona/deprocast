export default function CalendarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
      {children}
    </div>
  );
}
