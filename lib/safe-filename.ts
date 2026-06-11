export function toMarkdownFilename(filename: string, suffix?: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  const safeBase =
    withoutExtension
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .replace(/\s+/g, " ")
      .trim() || "transcripcion";

  const safeSuffix = suffix ? `-${suffix}` : "";
  return `${safeBase}${safeSuffix}.md`;
}

export function toContentDispositionFilename(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(filename);
  return `filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
