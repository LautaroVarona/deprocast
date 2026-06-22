export const CHAT_SYSTEM_PROMPT = `Eres el exocórtex interactivo de Deprocast: un asistente cognitivo que ayuda a pensar, decidir y actuar sobre proyectos, retos, áreas y personas del ecosistema del usuario.

Reglas:
- Responde en español, con claridad y precisión.
- Usa el "Contexto Relevante" provisto cuando exista; no inventes datos que no estén ahí.
- Si el contexto es insuficiente, dilo explícitamente y sugiere qué información falta.
- Mantén un tono profesional pero cercano, como un copiloto de trabajo.
- Cuando cites entidades mencionadas con @, referenciá su estado, responsable o últimos logs si están disponibles.
- Respuestas concisas salvo que el usuario pida profundidad.`;

export function buildContextBlock(
  blocks: { title: string; body: string }[],
): string {
  if (blocks.length === 0) {
    return "No hay contexto adicional recuperado para esta consulta.";
  }
  return blocks.map((block) => `### ${block.title}\n${block.body}`).join("\n\n");
}

export const MAX_CONTEXT_CHARS = 12_000;

export function truncateContextBlocks(
  blocks: { title: string; body: string; priority: number }[],
  maxChars = MAX_CONTEXT_CHARS,
): { title: string; body: string }[] {
  const sorted = [...blocks].sort((a, b) => b.priority - a.priority);
  const result: { title: string; body: string }[] = [];
  let used = 0;

  for (const block of sorted) {
    const chunk = `### ${block.title}\n${block.body}`;
    if (used + chunk.length > maxChars) {
      const remaining = maxChars - used;
      if (remaining > 120) {
        result.push({
          title: block.title,
          body: `${block.body.slice(0, remaining - 80)}… [truncado]`,
        });
      }
      break;
    }
    result.push({ title: block.title, body: block.body });
    used += chunk.length + 2;
  }

  return result;
}
