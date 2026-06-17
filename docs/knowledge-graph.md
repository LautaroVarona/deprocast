# Knowledge Graph local de Deprocast

Red de conocimiento viva, local-first, que representa personas, organizaciones,
proyectos, ideas, lugares, documentos y el propio código del repositorio, junto
con sus menciones y relaciones. Se construye a partir del código, de los
documentos existentes y de la información generada por el flujo del producto
(ingesta de audio, purificador, diario, proyectos).

Todo vive en la base SQLite local (`prisma/dev.db`); ningún byte sale de la
máquina salvo las llamadas a Vertex Gemini para la extracción semántica.

## 1. Modelo de datos (persistencia)

Definido en [prisma/schema.prisma](../prisma/schema.prisma):

- `KgNode` — entidad canónica del grafo.
  - `primaryName`, `type`, `aliases` (JSON), `metadata` (JSON), `confidence` (0–1).
  - Único por `(primaryName, type)`.
- `KgEdge` — relación dirigida entre nodos.
  - `relationType`, `context` (evidencia textual obligatoria), `weight` (1–12),
    `confidence`, `metadata`.
  - Único por `(sourceNodeId, targetNodeId, relationType)`.
- `KgMention` — evidencia/procedencia de un nodo.
  - `sourceType`, `sourceId`, `fragment`, `offsetStart/End`, `confidence`,
    `metadata`, `createdAt` (fecha/origen).
- `KgSource` — registro de ingesta incremental.
  - `(sourceType, sourceId)` único + `contentHash` para saltar lo no cambiado.

### Tipos de nodo (`NODE_TYPES`)

`persona`, `organizacion`, `proyecto`, `idea`, `concepto`, `lugar`, `tecnologia`,
`ley`, `proceso`, `documento`, `archivo`, `modulo`.

- Personas físicas/jurídicas se distinguen con `metadata.personaKind`.
- `documento` es el nodo canónico de cada `.md` (clave = ruta relativa).
- `archivo` y `modulo` son el subgrafo de código (clave = ruta relativa).

### Tipos de relación (`RELATION_TYPES`)

Semánticas: `menciona_a`, `trabaja_en`, `responsable_de`, `colabora_con`,
`pertenece_a`, `relacionado_con`, `participa_en`, `avatar_de`, `subordinado_de`,
`cliente_de`, `competidor_de`.
Documentales/código: `documenta`, `importa`, `depende_de`, `define`.

### Nodo canónico por tipo

| Tipo | Clave canónica |
|------|----------------|
| persona / organizacion | `normalize(primaryName)` + `type` (+ `personaKind`) |
| proyecto | `metadata.projectId` (del `.md`) |
| idea / concepto / lugar | `normalize(primaryName)` |
| documento | ruta relativa del archivo |
| archivo / modulo | ruta relativa del repo |

## 2. Capas

```
Ingesta → Extracción → Resolución → Persistencia → Consulta → Visualización/Export
```

- **Ingesta** ([lib/kg/code/scan.ts](../lib/kg/code/scan.ts),
  [lib/kg/sources/](../lib/kg/sources)): scanner de código determinístico y
  adapters de diario, proyectos, documentos crudos y master plan.
- **Extracción**: [lib/kg/extract.ts](../lib/kg/extract.ts) (Vertex Gemini, ver
  prompt en [lib/kg/prompts.ts](../lib/kg/prompts.ts)) + extracción estructurada
  desde frontmatter/imports.
- **Resolución de entidades** ([lib/kg/identity.ts](../lib/kg/identity.ts),
  [lib/kg/merge.ts](../lib/kg/merge.ts)): match exacto + fuzzy (Levenshtein),
  fusión de alias, edges de naturaleza dual y fusión total de duplicados.
- **Persistencia**: Prisma + SQLite.
- **Consulta** ([lib/kg/queries.ts](../lib/kg/queries.ts),
  [lib/kg/analytics.ts](../lib/kg/analytics.ts)).
- **Visualización/Export** ([app/grafo](../app/grafo),
  [lib/kg/export.ts](../lib/kg/export.ts)).

## 3. Resolución de entidades y duplicados

- `normalizeName` (minúsculas, sin acentos) + `namesMatchFuzzy`
  (inclusión + Levenshtein ≥ 0.85) en [lib/kg/normalize.ts](../lib/kg/normalize.ts).
- Alias y variantes se acumulan en `KgNode.aliases`; ver una entidad repetida
  refuerza su `confidence`.
- `getDuplicateCandidates()` detecta pares del mismo tipo por alias compartido,
  inclusión o similitud alta.
- `mergeNodes(keepId, dropId)` fusiona dos nodos: repunta edges y menciones,
  une alias/metadata, deduplica por la clave única y borra el descartado.

## 4. Ingesta incremental

[lib/kg/incremental.ts](../lib/kg/incremental.ts):
`ingestIfChanged(key, content, fn)` calcula el hash del contenido y lo compara
con `KgSource`. Si no cambió, se omite. Permite re-ejecutar el backfill sin
reconstruir el grafo. El scanner de código aplica el mismo hash por archivo
(solo reescribe las aristas `importa` de archivos cuyos imports cambiaron).

## 5. Integración con los flujos actuales

- **Purificador** ([lib/purifier/engine.ts](../lib/purifier/engine.ts)): extrae e
  ingiere KG por defecto desde audios/textos (estación "Extracción KG").
- **Diario** (`POST /api/journal/save`), **proyectos** (crear / progreso) y
  **documentos** (`POST /api/documents`): hooks no bloqueantes que ingieren la
  nueva fuente al grafo automáticamente.

## 6. Consultas disponibles

`lib/kg/queries.ts` y `lib/kg/analytics.ts`:

- `getNeighborhood(id)` — vecindario, relaciones y menciones de un nodo.
- `getProjectPeople(projectId)` — personas vinculadas a un proyecto.
- `getRelatedProjects(projectId)` — proyectos relacionados (vecinos compartidos).
- `getRepeatedIdeas()` — ideas/conceptos por número de menciones.
- `getCodeDependencies(fileId)` — qué importa y quién importa un archivo.
- `getCentralityRanking()` — nodos por grado y peso (centralidad).
- `getDuplicateCandidates()` — entidades con alias/menciones duplicadas.
- `getGraphSnapshot()` / `getKgStats()` — para la UI y métricas.

## 7. API HTTP

- `GET /api/kg/nodes?type&q&campoSlug&limit` — búsqueda de nodos.
- `GET /api/kg/nodes/[id]` — detalle + vecindario + menciones.
- `POST /api/kg/ingest` — ingesta directa de una extracción.
- `GET /api/kg/graph?types&excludeCode&limit` — snapshot para visualización.
- `GET /api/kg/stats` — estadísticas + centralidad + ideas recurrentes.
- `GET /api/kg/duplicates?type&limit` — pares candidatos a fusión.
- `POST /api/kg/merge` `{ keepId, dropId }` — fusiona duplicados.
- `GET /api/kg/code/[id]` — dependencias de un archivo de código.
- `GET /api/kg/export?format=json|graphml` — exporta el grafo completo.

## 8. Visualización

Página `/grafo` ([app/grafo/page.tsx](../app/grafo/page.tsx),
[components/grafo/](../components/grafo)):

- Grafo force-directed en canvas (sin dependencias externas): rueda = zoom,
  arrastrar = mover, clic = detalle.
- Filtros por tipo y conmutador "Ocultar código".
- Panel de detalle: relaciones, alias, confianza y menciones (evidencia).
- Pestaña Estadísticas: totales por tipo, centralidad e ideas recurrentes.
- Pestaña Duplicados: pares candidatos con acción de fusión.
- Export JSON / GraphML.

## 9. Backfill y mantenimiento

Requiere Node 24 (compatibilidad con el binario `better-sqlite3`) y credenciales
Vertex en `.env` (`GOOGLE_APPLICATION_CREDENTIALS2`, `GOOGLE_CLOUD_PROJECT2`,
`VERTEX_LOCATION`, `VERTEX_MODEL`).

```bash
npm run kg:scan       # grafo de código (determinístico, sin LLM)
npm run kg:backfill   # código + diario + proyectos + documentos + master plan
npm run kg:backfill -- --force            # reingesta forzada
npm run kg:backfill -- --only=code,projects
```

Targets válidos para `--only`: `code`, `journal`, `projects`, `documents`,
`masterplan`. El backfill es idempotente gracias a `KgSource`.

## 10. Base para capacidades superiores

El grafo queda listo como sustrato para: memoria de largo plazo, navegación
semántica, búsqueda contextual, agentes del exoesqueleto cognitivo y análisis de
relaciones entre personas, proyectos e ideas. Cada nodo lleva `confidence` y cada
relación lleva `context` + `weight`, de modo que los agentes pueden razonar sobre
la fuerza y la evidencia de cada vínculo.
