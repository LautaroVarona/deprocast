# Agentes20 — Inventario metacognitivo de Deprocast

> **Fecha:** 20 de julio de 2026  
> **Ámbito:** ecosistema de agentes, motores cognitivos y propuestas de expansión  
> **SSOT en código:** `lib/agentes/catalog.ts` (sincronizar con `docs/agentes.md`)

---

## Qué es Deprocast (metacognición)

Deprocast es un **exoesqueleto cognitivo local-first**: no es una app de productividad genérica sino un **Atanor** (circuito local soberano) donde la materia prima multimodal — audio de caminatas, texto, cuadernos OCR, tablas, marcadores sociales — entra al **Purifier**, se esteriliza con estaciones mixtas (LLM + determinísticas), pasa por **validación humana HITL** en `/validar`, y coagula en Markdown + SQLite como Knowledge Graph, proyectos Babel, tareas pendientes y asaltos de Trinchera.

El núcleo operativo es binario: el **Observador** (HITL, calibración 1–12, reconocimiento) y la **Estudianta** (ejecutor dopaminérgico de microtareas, aún en incubación). Ludus gamifica el ciclo Castillo → Campamento → Trinchera. Mnemosyne + Exocórtex cierran el loop RAG conversacional.

Con la ingesta molecular (jul 2026), cada captura porta **OriginAttribution** (linaje ambiental) y se fragmenta en **Quantomos** vía el agente **Quantador**, con espejo en el grafo para asaltos de trinchera.

---

## Resumen numérico

| Bucket | Cantidad |
|--------|----------|
| Operativos | 35 (incluye Quantador) |
| Magos | 5 |
| Diseño (incubación) | 2 |
| Subprocesadores Purifier | 3 |
| Fuentes KG | 3 |
| Pipelines sin nombre de agente (propuestas) | 9 |
| Agentes nuevos sugeridos (visión) | 8 |

---

## 1. Agentes operativos (35)

### Conversación y memoria

| id | Nombre | Qué hace | Funciones principales |
|----|--------|----------|----------------------|
| `exocortex` | Exocórtex Interactivo | Copiloto LLM con contexto híbrido | Menciones `@`, búsqueda léxica+vectorial+rerank, historial 10 turnos, título de sesión |
| `mnemosyne` | Mnemosyne | Memoria vectorial | Indexar corpus, embeddings, búsqueda para Exocórtex |

### Captura y transcripción

| id | Nombre | Qué hace | Funciones principales |
|----|--------|----------|----------------------|
| `stt` | Motor de Transcripción STT | Audio → texto | Deepgram, cola `processing-queue`, FFmpeg→WAV |
| `vision` | Agente de Visión OCR | OCR multimodal ingesta | Command A Vision, Markdown, `captureAndPurify` |
| `vision-atomica` | Agente de Visión Atómica | OCR esotérico cuadernos | semantic/structural/quanta, análisis de página |

### Purifier (pipeline 6 estaciones)

| id | Nombre | Qué hace | Funciones principales |
|----|--------|----------|----------------------|
| `orquestador` | Orquestador Purifier | Pipeline 1→6 (+4.1) | Gravedad, snapshots, review store, approve HITL |
| `editor-semantico` | Editor Semántico STT | Est. 2 | Muletillas, puntuación, `==DUDA:==` |
| `extractor-esencias` | Extractor de Esencias | Est. 4 | Tags atómicos JSON, máx 30 |
| `motor-kg` | Motor de Extracción KG | Est. 4.1 | Entidades, relaciones, weight 1–12 |
| `archivista` | Archivista Deprocast | Est. 5 | Frontmatter YAML, Siete Dimensiones |
| `meta-meteador` | Meta-Meteador | Metadatos cuánticos | Títulos, matriz 6 dims, DocumentMeta→KG |

### Ingesta molecular (nuevo)

| id | Nombre | Qué hace | Funciones principales |
|----|--------|----------|----------------------|
| `quantador` | Quantador | Fragmentación molecular | `segmentarTexto` → Quantomos; `vincularOrigen`; asaltos sugeridos async post-captura |

### Tareas y trinchera

| id | Nombre | Qué hace | Funciones principales |
|----|--------|----------|----------------------|
| `listador` | El Listador | Tareas desde diario/texto | LLM → PendingTask `suggested`, dedup 24h |
| `task-calibrator` | Calibrador de Tareas | HITL peso 1–12 | Desvalidar &lt;4, alimentar asaltos |
| `extractor-trailing` | Extractor Trailing | Compromisos fin de audio | PendingTask + eventos, fechas relativas |
| `extractor-eventos` | Extractor de Eventos | Eventos contextuales | ContextEvent HITL, calendario |
| `foco-trinchera` | Foco de Trinchera | Foco diario | Obligatorias/sugeridas/asaltos, Laboratorio Sonoro |

### Babel, proyectos, enciclopedia

| id | Nombre | Qué hace | Funciones principales |
|----|--------|----------|----------------------|
| `babel-universes` | Universos de Babel | Planos de proyección | BabelRecord, filtro cruzado, boost trinchera |
| `incubador-atanor` | Incubador del Atanor | Nuevos proyectos | Entrevista LLM, ProjectIncubationSession |
| `enciclopediador` | Enciclopediador | Enciclopedia generativa | Entradas, grafo de sesión, HITL reports |

### Ludus y cartografía

| id | Nombre | Qué hace | Funciones principales |
|----|--------|----------|----------------------|
| `ludus` | LudusDirector | Orquesta Ludus | Castillo/Campamento/Trinchera, vision board |
| `planificador-campamento` | Planificador de Campamento | UI semana/mes | Drag&drop, ideas rápidas |
| `grafologo-castillo` | Grafólogo del Castillo | Mapa ego-céntrico | Nodo YO, filtros, deep links |
| `cartografo-campamento` | Cartógrafo del Campamento | Mapa geo Leaflet | Permanentes/temporales, HITL popup |
| `georreferenciador` | Georreferenciador | Nominatim + GeoLocation | Geocode cache, enriquecer eventos |

### Molecular (ejes X/Y/Z)

| id | Nombre | Qué hace | Funciones principales |
|----|--------|----------|----------------------|
| `chunkeador-semantico` | Chunkeador Semántico | Segmentación determinística | Partículas para ejes moleculares |
| `calibrador-central` | Calibrador Central | HITL posición molecular | Proponer ejes, validar partículas |

### Salud y temporal

| id | Nombre | Qué hace | Funciones principales |
|----|--------|----------|----------------------|
| `centinela-somatico` | Centinela Somático | Captura salud multimodal | Texto/foto/voz → visión/STT/Nutrimetron |
| `nutrimetron` | Nutrimetron | Combustible / macros | Ítems+macros HITL, foto/voz |
| `kinetometro` | Kinetómetro | Rendimiento físico | Duración/intensidad, historial carga |
| `cronista` | Cronista | Salud → timeline | ContextEvent, Historial, backfill |
| `orquestador-temporal` | Orquestador Temporal | SSOT temporal | PendingTask+ContextEvent, reschedule |

### Calibración y utilidades

| id | Nombre | Qué hace | Funciones principales |
|----|--------|----------|----------------------|
| `calibrador` | Calibrador de Vibe | HITL pesos 1–12 | Cola validated/generated, votos |
| `binauralizer` | Binauralizer | Tonos binaurales | Web Audio, presets Gamma/Alpha/Theta/Delta |
| `cam-recorder-watcher` | Cam-Recorder-Watcher | Mock screen recordings | NDJSON foco 1–12, inyección Jornada |

---

## 2. Magos (5)

| id | Nombre | Qué hace | Funciones principales |
|----|--------|----------|----------------------|
| `mago-traductor` | Mago Traductor | Bridge tech bajo demanda | Recomendar stack según RAM mental/urgencia; guías cortas |
| `mago-22` | El Mago 22 | Matriz 22 arcanos | CORE_ARCANA_22, proyección colecciones, fogLevel |
| `mago-3` | El Mago 3 | 3 Madres | Aleph/Mem/Shin, Mercurio/Azufre/Sal |
| `mago-7` | El Mago 7 | 7 Dobles | V.I.T.R.I.O.L., Sephirot/chakras |
| `mago-12` | El Mago 12 | 12 Simples | Astrología, Gran Obra, bodas alquímicas |

---

## 3. Subprocesadores Purifier (3)

| id | Estación | Nombre | Descripción |
|----|----------|--------|-------------|
| `s1` | Est. 1 | Limpieza Regex | Amputa loops Whisper, oraciones duplicadas |
| `s3` | Est. 3 | Deduplicación Jaccard | Fusiona párrafos similitud ≥ 0.82 |
| `s6` | Est. 6 | Segmentación Fractal | Bloques padre/hijo (4 líneas/hijo) |

---

## 4. Agentes en diseño (2)

| id | Nombre | Propósito planeado |
|----|--------|-------------------|
| `somatometron` | Somatometrón | Telemetría wearables (sueño, HRV) → Siete Dimensiones |
| `ambientografo` | Ambientógrafo | Entorno (sol, aire, meditación) no biométrico |

---

## 5. Fuentes de ingesta KG (3)

| id | Nombre | Descripción |
|----|--------|-------------|
| `code-scanner` | Escáner AST | Imports → nodos/aristas `importa` |
| `journal` | Fuente diario | Entradas Markdown del diario |
| `projects` | Fuente proyectos | Frontmatter `data/projects/` |

---

## 6. Código que amerita nombre de agente (sin renombrar aún)

Estos módulos hacen trabajo agent-like pero **no están registrados** en el catálogo. Propuesta de id para futura incorporación:

| id propuesto | Nombre display | Módulo actual | Por qué |
|--------------|----------------|---------------|---------|
| `destilador-sesiones` | Destilador de Sesiones | `lib/memory/session-distill.ts` | Destila chats Exocórtex → átomos Markdown |
| `enriquecedor-bookmarks` | Enriquecedor de Bookmarks X | `lib/ingesta/x-bookmarks/enrich.ts` | Calibra + enriquece marcadores sociales |
| `hermeneuta-cuadernos` | Hermeneuta de Cuadernos | `lib/cuadernos/enrichment.ts` | Post-OCR: diagrama, esquema, relaciones |
| `auditor-memorias` | Auditor de Memorias | `lib/memorias/analyze.ts` | Segmenta memorias PGC, coherencia fiscal |
| `tabulador` | Tabulador Atanor | `lib/ingesta/tablas/*` | CSV/XLSX → Markdown por campo |
| `monitor-cortex` | Monitor Córtex | `lib/cortex/queries.ts` | Snapshot sesgo semántico / grid conocimiento |
| `validador-tareas` | Validador de Tareas | `lib/pendientes/store.ts` (recognize/reject) | HITL citado por calibrador pero ausente del catálogo |
| `metabolometro-audio` | Metabolómetro de Audio | `lib/audio-station/metabolism.ts` | Telemetría downstream asset→tareas/eventos |
| `escaner-codigo` | Escáner de Código AST | `lib/kg/code/scan.ts` | Ya en KG_INGEST_SOURCES, no como agente |

---

## 7. Agentes nuevos sugeridos (visión 2026)

| id | Nombre | Rationale |
|----|--------|-----------|
| `estudianta` | Estudianta | Núcleo binario del grimorio: avatar ejecutor &lt;15 min, Puntos de Señal |
| `trituradora-friccion` | Trituradora de Fricción | Fragmentar Bosses en microtareas dopaminérgicas |
| `vinculador-proyectos` | Vinculador de Proyectos | Sugerir Campo/Proyecto destino post-Purifier con HITL |
| `reconciliador-identidades` | Reconciliador de Identidades | Unificar aliases persona/org en KG |
| `guardian-soberania` | Guardián de Soberanía | Auditar egress cloud, wipe/backup, políticas local-first |
| `contraste-jornada` | Contraste de Jornada | Cierre diario: Cam-Recorder + Trinchera + salud → retrospectiva |
| `whisper-local` | Whisper Local | STT on-device (objetivo grimorio) |
| `diplomata-babel` | Diplomata Babel | Proponer Universos y sellos cuando la materia cruza planos |

---

## 8. Ingesta molecular — piezas implementadas (jul 2026)

### Modelos Prisma

- **`OriginAttribution`**: `channel`, `timestampExacto`, `diaSemana`, `locationName?`, `actors` JSON
- **`Quantomo`**: `titleSugerido`, `content`, `tagsSemanticos`, `universo`, FK `originAttributionId`
- **`KgEdge.reconocido`**: boolean para espejo de asaltos de trinchera

### Flujo

```
Captura UI → captureAndPurify → OriginAttribution (SQLite)
                            → Purifier HITL
                            → Quantador async → Quantomos + PendingTask suggested
                            → recognize/calibrate → KgEdge espejo (asalto_trinchera)
```

### Migración local segura

```bash
# Backup opcional
cp prisma/dev.db prisma/dev.db.bak

# Aplicar migración
npx prisma migrate deploy
npx prisma generate

# Si hay drift local (patrón del repo):
npm run db:meta
```

Migración SQL: `prisma/migrations/20260720100000_quantomos_origin_asaltos_mirror/`

---

## 9. Espejo PendingTask ↔ KgEdge

- **SSOT HITL:** `PendingTask` (suggested → recognized → calibrated)
- **Espejo grafo:** al reconocer/calibrar/rechazar, `lib/pendientes/asalto-mirror.ts` upserta `KgEdge` con `relationType: "asalto_trinchera"`, `weight` 1–12, `reconocido`
- **UI:** grid simétrico en `/pendientes` (tab Sugeridas); un clic "Reconocido" sube peso del edge +1 (cap 12)
- El usuario puede consultar el mismo asalto vía tareas o vía grafo según su flujo

---

*Documento generado el 20 de julio de 2026. Mantener sincronizado con `lib/agentes/catalog.ts` al añadir agentes.*
