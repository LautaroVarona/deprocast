import { parseMetadataJson } from "@/lib/kg/normalize";
import { prisma } from "@/lib/prisma";

export async function getAssetDetail(id: string) {
  const asset = await prisma.audioAsset.findUnique({
    where: { id },
    include: {
      transcript: {
        include: {
          parentChunks: {
            orderBy: { startTimeMs: "asc" },
            include: { children: true },
          },
        },
      },
    },
  });

  if (!asset) return null;

  const parentChunkIds =
    asset.transcript?.parentChunks.map((chunk) => chunk.id) ?? [];

  const kgMentions =
    parentChunkIds.length > 0
      ? await prisma.kgMention.findMany({
          where: {
            sourceType: "parent_chunk",
            sourceId: { in: parentChunkIds },
          },
          include: { node: true },
          orderBy: { createdAt: "asc" },
        })
      : [];

  const assetMentions = await prisma.kgMention.findMany({
    where: { sourceType: "audio_asset", sourceId: id },
    include: { node: true },
    orderBy: { createdAt: "asc" },
  });

  const allMentions = [...kgMentions, ...assetMentions];

  const kgNodes = Array.from(
    new Map(allMentions.map((mention) => [mention.node.id, mention.node])).values(),
  );

  const kgEntities = kgNodes.filter((node) => {
    const meta = parseMetadataJson(node.metadata);
    return meta.rol !== "meta_tag";
  });

  const kgTags = kgNodes.filter((node) => {
    const meta = parseMetadataJson(node.metadata);
    return meta.rol === "meta_tag";
  });

  return {
    ...asset,
    kgMentions: allMentions,
    kgEntities,
    kgTags,
  };
}

export type AssetDetail = NonNullable<Awaited<ReturnType<typeof getAssetDetail>>>;
