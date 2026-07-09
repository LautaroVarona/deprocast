const MAX_CHUNK_CHARS = 1200;
const CHUNK_OVERLAP = 150;

export function chunkTextForEmbedding(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  if (normalized.length <= MAX_CHUNK_CHARS) {
    return [normalized];
  }

  const paragraphs = normalized.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= MAX_CHUNK_CHARS) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      const overlap = current.slice(-CHUNK_OVERLAP);
      current = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
    } else {
      for (let i = 0; i < paragraph.length; i += MAX_CHUNK_CHARS - CHUNK_OVERLAP) {
        chunks.push(paragraph.slice(i, i + MAX_CHUNK_CHARS));
      }
      current = "";
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.filter(Boolean);
}
