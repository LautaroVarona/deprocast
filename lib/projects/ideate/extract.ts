import "server-only";

import { listAmazonAResources } from "@/lib/amazona/store";
import { searchMentionSuggestions } from "@/lib/chat/mention-index";
import { namesMatchFuzzy, normalizeName } from "@/lib/kg/normalize";
import {
  buildIdeatePrompt,
  formatMentionHints,
} from "@/lib/projects/ideate/prompts";
import {
  emptyIdeateLlmOutput,
  ideateLlmOutputSchema,
  ideateResponseSchema,
  normalizeCampoSlugSuggestion,
  normalizeTipoSuggestion,
  type IdeateLlmOutput,
  type IdeateMention,
  type IdeateRequest,
  type IdeateResponse,
  type ResolvedIdeateMention,
} from "@/lib/projects/ideate/schema";
import { cohereGenerateText } from "@/lib/cohere/chat";
import { stripMarkdownFences } from "@/lib/cohere/extract";

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = normalizeName(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export async function extractIdeateFromDump(
  title: string,
  brainDump: string,
  mentions: IdeateMention[],
): Promise<IdeateLlmOutput> {
  if (!brainDump.trim()) {
    return emptyIdeateLlmOutput(title);
  }

  const prompt = buildIdeatePrompt(title, brainDump, formatMentionHints(mentions));

  const raw = stripMarkdownFences(
    await cohereGenerateText({
      systemPrompt: prompt,
      userContent: "Destilá el proyecto a JSON estructurado.",
      modelKind: "default",
      jsonMode: true,
      throttle: true,
    }),
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyIdeateLlmOutput(title);
  }

  const validated = ideateLlmOutputSchema.safeParse(parsed);
  if (!validated.success) {
    return emptyIdeateLlmOutput(title);
  }

  return validated.data;
}

async function resolveLabel(
  prefix: "@" | "#",
  label: string,
  entityId?: string,
  entityType?: string,
): Promise<ResolvedIdeateMention> {
  if (entityId) {
    return {
      prefix,
      label,
      kgNodeId: entityId,
      entityType: entityType ?? (prefix === "@" ? "persona" : "campo"),
      matched: true,
    };
  }

  const suggestions = await searchMentionSuggestions(label, 8);
  const preferred =
    prefix === "@"
      ? suggestions.filter((s) => s.entityType === "persona")
      : suggestions.filter(
          (s) =>
            s.entityType === "campo" ||
            s.entityType === "area" ||
            s.entityType === "proyecto",
        );

  const pool = preferred.length > 0 ? preferred : suggestions;
  const hit =
    pool.find((s) => namesMatchFuzzy(s.label, label)) ??
    pool.find((s) => normalizeName(s.label).includes(normalizeName(label))) ??
    null;

  if (!hit) {
    return {
      prefix,
      label,
      kgNodeId: null,
      entityType: prefix === "@" ? "persona" : "tag",
      matched: false,
    };
  }

  return {
    prefix,
    label: hit.label,
    kgNodeId: hit.entityId,
    entityType: hit.entityType,
    matched: true,
  };
}

export async function resolveIdeateMentions(
  requestMentions: IdeateMention[],
  llm: IdeateLlmOutput,
): Promise<ResolvedIdeateMention[]> {
  const explicit = await Promise.all(
    requestMentions.map((m) =>
      resolveLabel(m.prefix, m.label, m.entityId, m.entityType),
    ),
  );

  const suggestedPersons = await Promise.all(
    llm.suggested_person_labels.map((label) => resolveLabel("@", label)),
  );
  const suggestedTags = await Promise.all(
    llm.suggested_tags.map((label) => resolveLabel("#", label)),
  );

  const merged: ResolvedIdeateMention[] = [];
  const seen = new Set<string>();

  for (const item of [...explicit, ...suggestedPersons, ...suggestedTags]) {
    const key = `${item.prefix}:${normalizeName(item.label)}:${item.kgNodeId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

export async function buildIdeateResponse(
  request: IdeateRequest,
): Promise<IdeateResponse> {
  const llm = await extractIdeateFromDump(
    request.title,
    request.brainDump,
    request.mentions,
  );

  const [resolved_mentions, allResources] = await Promise.all([
    resolveIdeateMentions(request.mentions, llm),
    listAmazonAResources(),
  ]);

  const resourceIdSet = new Set(request.amazonAResourceIds);
  const amazonA = allResources
    .filter((r) => resourceIdSet.has(r.id))
    .map((r) => ({
      id: r.id,
      name: r.name,
      powerIds: r.powerIds,
    }));

  const powerIds = uniqueStrings(amazonA.flatMap((r) => r.powerIds));
  const campoSlug = normalizeCampoSlugSuggestion(llm.suggested_campo_slug);
  const tipo = normalizeTipoSuggestion(llm.suggested_tipo);

  const personNodeIds = uniqueStrings(
    resolved_mentions
      .filter((m) => m.prefix === "@" && m.matched && m.kgNodeId)
      .map((m) => m.kgNodeId as string),
  );

  const areaNodeIds = uniqueStrings(
    resolved_mentions
      .filter(
        (m) =>
          m.prefix === "#" &&
          m.matched &&
          m.kgNodeId &&
          (m.entityType === "campo" ||
            m.entityType === "area" ||
            m.entityType === "proyecto"),
      )
      .map((m) => m.kgNodeId as string),
  );

  const tagLabels = uniqueStrings([
    ...resolved_mentions
      .filter((m) => m.prefix === "#")
      .map((m) => m.label),
    ...llm.suggested_tags,
  ]);

  const response = ideateResponseSchema.parse({
    ...llm,
    suggested_campo_slug: campoSlug,
    suggested_tipo: tipo ?? undefined,
    title: request.title.trim(),
    resolved_mentions,
    amazonA,
    matrix_seed: {
      identidad: {
        title: request.title.trim(),
        short_pitch: llm.short_pitch,
        domain: llm.domain,
        tipo,
        campoSlug,
      },
      arquitectura: {
        personNodeIds,
        tagLabels,
        areaNodeIds,
      },
      motor_temporal: {
        mago3: llm.suggested_mago_phase,
        mago12: llm.suggested_mago12 ?? null,
      },
      operativa: {
        moscow_tasks: llm.moscow_tasks,
      },
      arsenal: {
        resourceIds: amazonA.map((r) => r.id),
        powerIds,
      },
      telemetria: {
        energyCost: llm.suggested_energy_cost,
        origin: "ideate" as const,
      },
    },
  });

  return response;
}
