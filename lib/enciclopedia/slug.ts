export function conceptToSlug(concept: string): string {
  return concept
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function normalizeConcept(concept: string): string {
  return concept.trim().replace(/\s+/g, " ");
}
