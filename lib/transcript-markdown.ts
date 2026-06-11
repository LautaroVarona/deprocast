import { formatDate } from "@/lib/format";

type TranscriptMarkdownInput = {
  filename: string;
  originalCreatedAt: Date;
  status: string;
  rawText: string;
  confidence: number | null;
  transcriptCreatedAt?: Date;
};

export function buildTranscriptMarkdown({
  filename,
  originalCreatedAt,
  status,
  rawText,
  confidence,
  transcriptCreatedAt,
}: TranscriptMarkdownInput): string {
  const lines = [
    `# ${filename}`,
    "",
    `- **Fecha original del audio:** ${formatDate(originalCreatedAt)}`,
    `- **Estado:** ${status}`,
  ];

  if (transcriptCreatedAt) {
    lines.push(
      `- **Transcrito el:** ${formatDate(transcriptCreatedAt)}`,
    );
  }

  if (confidence !== null) {
    lines.push(`- **Confianza:** ${(confidence * 100).toFixed(1)}%`);
  }

  lines.push("", "---", "", "## Transcripción", "", rawText.trim(), "");

  return lines.join("\n");
}
