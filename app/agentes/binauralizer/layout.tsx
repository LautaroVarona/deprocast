export default function BinauralizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] overflow-y-auto bg-black">
      {children}
    </div>
  );
}
