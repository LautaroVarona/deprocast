import { formatDate } from "@/lib/format";

export type TranscriptMarkdownInput = {
  filename: string;
  originalCreatedAt: Date;
  status: string;
  rawText: string;
  confidence: number | null;
  transcriptCreatedAt?: Date;
};

function buildTranscriptMetadataLines({
  originalCreatedAt,
  status,
  confidence,
  transcriptCreatedAt,
}: Pick<
  TranscriptMarkdownInput,
  "originalCreatedAt" | "status" | "confidence" | "transcriptCreatedAt"
>): string[] {
  const lines = [
    `- **Fecha original del audio:** ${formatDate(originalCreatedAt)}`,
    `- **Estado:** ${status}`,
  ];

  if (transcriptCreatedAt) {
    lines.push(`- **Transcrito el:** ${formatDate(transcriptCreatedAt)}`);
  }

  if (confidence !== null) {
    lines.push(`- **Confianza:** ${(confidence * 100).toFixed(1)}%`);
  }

  return lines;
}

export function buildTranscriptMarkdown(input: TranscriptMarkdownInput): string {
  const lines = [
    `# ${input.filename}`,
    "",
    ...buildTranscriptMetadataLines(input),
    "",
    "---",
    "",
    "## Transcripción",
    "",
    input.rawText.trim(),
    "",
  ];

  return lines.join("\n");
}

export function buildCombinedTranscriptMarkdown(
  assets: TranscriptMarkdownInput[],
  generatedAt: Date = new Date(),
): string {
  const lines = [
    "# Transcripciones",
    "",
    `- **Audios incluidos:** ${assets.length}`,
    `- **Generado el:** ${formatDate(generatedAt)}`,
    "",
  ];

  if (assets.length > 0) {
    lines.push("## Índice", "");
    for (const [index, asset] of assets.entries()) {
      lines.push(
        `${index + 1}. **${asset.filename}** — ${formatDate(asset.originalCreatedAt)}`,
      );
    }
    lines.push("");
  }

  lines.push("---", "");

  const sections = assets.map((asset, index) => {
    const sectionLines = [
      `## ${index + 1}. ${asset.filename}`,
      "",
      ...buildTranscriptMetadataLines(asset),
      "",
      "### Transcripción",
      "",
      asset.rawText.trim(),
      "",
    ];
    return sectionLines.join("\n");
  });

  lines.push(sections.join("\n---\n\n"));

  return lines.join("\n");
}
