# Agentes — Única Fuente de Verdad (Deprocast)

> **Documento:** `docs/agentes.md`  
> **Ámbito:** ecosistema de agentes y motores cognitivos de `deprocast2`  
> **Última verificación de código:** 22 de junio de 2026  
> **Principio:** este archivo describe **solo** lo que existe o está explícitamente en desarrollo en el repositorio. No sustituye al grimorio arquitectónico (`deprocast_master_plan.md`) ni a la especificación del KG (`knowledge-graph.md`). Para el pipeline de audio completo, ver [`Audio.md`](Audio.md).

---

## Tabla de contenidos

1. [Visión general](#1-visión-general)
2. [Mapa de dependencias](#2-mapa-de-dependencias)
3. [Agentes operativos](#3-agentes-operativos)
4. [Subprocesadores determinísticos del Purifier](#4-subprocesadores-determinísticos-del-purifier)
5. [Ingesta y persistencia del Knowledge Graph](#5-ingesta-y-persistencia-del-knowledge-graph)
6. [Agentes en fase de diseño](#6-agentes-en-fase-de-diseño)

---

## 1. Visión general

Deprocast implementa un **exoesqueleto cognitivo local-first**: la materia prima (audio, texto, tablas, visión, diario) pasa por motores de transcripción y purificación, se somete a validación humana (HITL) y alimenta un Knowledge Graph en SQLite. El único agente conversacional de cara al usuario es el **Exocórtex Interactivo** (`/chat`).

| Capa | Rol | ¿Usa LLM? |
|------|-----|-----------|
| Conversacional | Copiloto con contexto inyectado | Sí — Vertex Gemini |
| Transcripción | Audio → texto crudo | No — GCP Speech (`chirp_2`) |
| Purificación | Esterilización, metadatos, chunks | Mixto — 3 estaciones LLM + 3 determinísticas |
| Visión | OCR multimodal | Sí — Vertex Gemini |
| Knowledge Graph | Entidades, relaciones, menciones | Mixto — extracción LLM + ingesta determinística |
| Calibración | Pesos de gravedad 1–12 | No — HITL humano |

**Proveedor LLM unificado:** `@google-cloud/vertexai` vía `lib/vertex-gemini/client.ts` (modelo por defecto: `gemini-2.5-flash`, temperatura `0.2`).

---

## 2. Mapa de dependencias

```mermaid
flowchart LR
    subgraph captura [Captura]
        Audio[Audio upload]
        Texto[Texto / Diario]
        Vision[Visión OCR]
        Tablas[CSV / XLSX]
    end

    subgraph stt [Transcripción]
        Queue[processing-queue]
        GCP[GCP Speech chirp_2]
    end

    subgraph purifier [Purifier]
        S1[Est.1 Regex]
        S2[Est.2 Editor Semántico]
        S3[Est.3 Dedup]
        S4[Est.4 Esencias]
        S41[Est.4.1 Motor KG]
        S5[Est.5 Archivista]
        S6[Est.6 Fractal]
    end

    subgraph hitl [HITL]
        Review[data/raw_documents/review]
        Validar[/validar]
    end

    subgraph kg [Knowledge Graph]
        SQLite[(prisma/dev.db)]
    end

    subgraph chat [Conversación]
        Exocortex[Exocórtex /chat]
    end

    Audio --> Queue --> GCP
    GCP --> purifier
    Texto --> purifier
    Vision --> purifier
    Tablas --> purifier
    purifier --> Review --> Validar
    S41 --> SQLite
    Validar --> SQLite
    SQLite --> Exocortex
```

---

## 3. Agentes operativos

### 🧠 Exocórtex Interactivo

**Funciones:**
- Recibir mensajes del usuario con segmentos de texto y menciones `@` tipadas.
- Resolver menciones a proyectos, retos, áreas, personas, campos y retos laborales.
- Ejecutar búsqueda híbrida (menciones KG, aristas, diario) sobre la consulta en lenguaje natural.
- Inyectar bloques de contexto truncados en el system prompt.
- Mantener historial de sesión (últimos 10 turnos) y persistir intercambios en SQLite.
- Generar título automático de sesión en el primer mensaje.

**Descripción:**  
Asistente cognitivo de Deprocast. Por cada turno construye un `contextBlock` a partir de entidades mencionadas (`buildChatContext`) y de hits de `hybridSearch` (scoring léxico sobre `KgMention`, `KgEdge` y entradas del diario). Concatena `CHAT_SYSTEM_PROMPT` + contexto y envía el historial formateado a Vertex Gemini. No inventa datos fuera del contexto inyectado; declara explícitamente cuando falta información.

**Ubicación:**
- Motor: `lib/chat/engine.ts`, `lib/chat/context-retriever.ts`, `lib/chat/hybrid-search.ts`, `lib/chat/prompts.ts`, `lib/chat/service.ts`, `lib/chat/mention-index.ts`
- API: `app/api/chat/send/route.ts`, `app/api/chat/sessions/`, `app/api/chat/mentions/route.ts`
- UI: `app/chat/page.tsx`, `components/chat/`

**Tecnologías/Dependencias:**  
Vertex AI Gemini (`lib/vertex-gemini/`), Prisma (`ChatSession`, `ChatMessage`, `ChatContextRelation`), KG (`lib/kg/queries`), proyectos (`lib/projects/service`), laboral (`lib/laboral/challenges`), diario (`lib/journal/`).

---

### 🎙️ Motor de Transcripción STT

**Funciones:**
- Encolar `AudioAsset` en cola in-process (`ProcessingQueue`).
- Convertir audio a WAV con FFmpeg/FFprobe.
- Transcribir sincrónicamente o por chunks según duración.
- Persistir `Transcript.rawText` y actualizar estado del asset (`PROCESSING` → `COMPLETED` / `ERROR`).
- Guardar transcripciones parciales ante fallos recuperables.

**Descripción:**  
No es un agente LLM: convierte voz a texto crudo mediante Google Cloud Speech API con el modelo `chirp_2` (es-ES). El texto resultante alimenta manual o automáticamente el Purifier vía `POST /api/purifier/purify` con `assetId`. La cola no es persistente entre reinicios del proceso Node.

**Ubicación:**
- Procesador: `lib/gcp-speech-processor.ts`
- Cola: `lib/processing-queue.ts`
- STT: `lib/gcp-speech/` (`client.ts`, `transcribe-sync.ts`, `transcribe-chunked.ts`, `audio-prep.ts`, `config.ts`)
- API: `app/api/upload/route.ts`, `app/api/process/`
- UI: `app/audio/[id]/page.tsx`, `components/ingesta/channels/audio-channel.tsx`

**Tecnologías/Dependencias:**  
`@google-cloud/speech`, FFmpeg (`ffmpeg-static`, `ffprobe-static`), Prisma (`AudioAsset`, `Transcript`), variables `GOOGLE_APPLICATION_CREDENTIALS`, `GCP_SPEECH_*`.

---

### 👁️ Agente de Visión OCR

**Funciones:**
- Aceptar imágenes (PNG, JPG, WEBP, GIF, HEIC) y PDF.
- Almacenar binario original en `data/tacho/`.
- Enviar contenido multimodal (inline base64) a Gemini con `VISION_EXTRACTION_PROMPT`.
- Devolver Markdown purificado (tachones como `~~texto~~`, descripción analítica de diagramas).
- Opcionalmente confirmar contexto y anexarlo como `.md` al proyecto destino.
- Encadenar captura → Purifier vía `captureAndPurify`.

**Descripción:**  
Agente de extracción y purificación de data de alta fidelidad. Prioriza fidelidad sobre interpretación: transcribe tachones, describe relaciones visuales en gráficos y evita suposiciones. Tras la extracción, el flujo estándar de ingesta dispara el pipeline Purifier completo.

**Ubicación:**
- Motor: `lib/ingesta/vision/extract.ts`
- API: `app/api/ingesta/vision/route.ts`
- UI: `components/ingesta/channels/vision-channel.tsx`

**Tecnologías/Dependencias:**  
Vertex AI Gemini (entrada multimodal `inlineData`), filesystem (`data/tacho/`), Purifier (`lib/purifier/capture.ts`).

---

### ✂️ Editor Semántico STT (Purifier · Estación 2)

**Funciones:**
- Recibir texto post-limpieza regex (Estación 1).
- Eliminar muletillas vacías sin alterar significado.
- Corregir puntuación y oralidad → prosa escrita.
- Marcar segmentos incomprensibles como `==DUDA: fragmento==`.
- Preservar bloques `==DUDA:...==` preexistentes.

**Descripción:**  
Primera capa semántica del Purifier. Usa `CLEANUP_SYSTEM_PROMPT` como system instruction de Gemini. Es invocado por `station2SemanticCleanup` dentro de `runPurificationPipeline`. No inventa contenido; cuando hay ambigüedad, deja evidencia explícita para revisión HITL.

**Ubicación:** `lib/purifier/engine.ts` (prompt y `station2SemanticCleanup`)

**Tecnologías/Dependencias:** Vertex AI Gemini, orquestador `runPurificationPipeline`.

---

### 🏷️ Extractor de Esencias (Purifier · Estación 4)

**Funciones:**
- Analizar texto deduplicado (Estación 3).
- Devolver array JSON de conceptos atómicos (nombres propios, leyes, bugs, tecnologías, procesos).
- Limitar salida a 30 tags máximo con fallback de parseo tolerante.

**Descripción:**  
Extracción ligera de metadatos secundarios (`meta_tags_secundarios`) que alimentan la normalización de la Estación 5. Prompt: `EXTRACT_ESSENCES_PROMPT`. Salida consumida por `station5Normalize`.

**Ubicación:** `lib/purifier/engine.ts` (`station4ExtractEssences`, `EXTRACT_ESSENCES_PROMPT`)

**Tecnologías/Dependencias:** Vertex AI Gemini.

---

### 🕸️ Motor de Extracción KG (Purifier · Estación 4.1)

**Funciones:**
- Analizar texto purificado y devolver JSON estructurado de entidades y relaciones.
- Tipificar nodos (`persona`, `proyecto`, `idea`, `tecnologia`, etc.) con aliases y `personaKind`.
- Exigir `context` obligatorio en cada relación y `weight` 1–12.
- Parsear y validar respuesta (`parseLlmKgExtraction`).
- Ingerir resultado en SQLite (`ingestKgExtraction` / `ingestDocumentSource`) cuando `extractKg: true`.

**Descripción:**  
Motor de extracción del Grafo de Conocimiento. Identidad definida en `KG_EXTRACT_PROMPT` (`lib/kg/prompts.ts`). Puede ejecutarse embebido en el Purifier (estación 41) o de forma directa vía `extractKgFromText` / `POST /api/kg/ingest`. Respeta límites de 25 entidades y 40 relaciones por fragmento. Distingue personas físicas/jurídicas, proyectos del Observador y avatar Estudianta cuando el texto lo evidencia.

**Ubicación:**
- Extracción: `lib/kg/extract.ts`, `lib/kg/prompts.ts`, `lib/kg/parse.ts`
- Ingesta: `lib/kg/ingest.ts`, `lib/kg/identity.ts`, `lib/kg/merge.ts`
- Integración Purifier: `lib/purifier/engine.ts` (bloque `extractKg`)
- API: `app/api/kg/ingest/route.ts`

**Tecnologías/Dependencias:** Vertex AI Gemini, Prisma (`KgNode`, `KgEdge`, `KgMention`, `KgSource`), SQLite local.

---

### 📜 Archivista Deprocast (Purifier · Estación 5)

**Funciones:**
- Recibir texto purificado + meta tags + vectores de gravedad sugeridos.
- Generar Markdown completo con frontmatter YAML de las **Siete Dimensiones**.
- Asignar `prioridad`, `impacto`, `dificultad` (1–12), `title`, `particula`.
- Preservar marcadores `==DUDA:...==` en el cuerpo.
- Parsear frontmatter resultante para construir `PurifierReviewRecord`.

**Descripción:**  
Archivista del sistema. Prompt: `NORMALIZE_SYSTEM_PROMPT`. Transforma transcripciones en documentos coagulables con contrato YAML unificado (`materia`, `particula`, `posicion`, `onda`, `tiempo`, `espacio`, `field`). Valores por defecto: `field: babel`, `materia: audio/transcript`, `espacio: local-atanor`.

**Ubicación:** `lib/purifier/engine.ts` (`station5Normalize`, `NORMALIZE_SYSTEM_PROMPT`, `parseFrontmatterFromMarkdown`)

**Tecnologías/Dependencias:** Vertex AI Gemini, `lib/projects/priority` (`clampScale`), `lib/projects/campos`.

---

### 🔥 Orquestador Purifier

**Funciones:**
- Ejecutar secuencialmente estaciones 1 → 6 (+ 4.1 opcional).
- Resolver gravedad de entrada (`GravityInput`) y fuente KG (`journal`, `transcript`, `raw_document`).
- Registrar snapshot por estación (`PurifierStageSnapshot[]`) en `PurifierReviewRecord` schema v2.
- Persistir revisión en `data/raw_documents/review/{reviewId}.json`.
- Exponer aprobación HITL (`approveAndCoagulate`, `approveToProposal`).

**Descripción:**  
Pipeline central de esterilización. Punto de entrada único: `runPurificationPipeline`. La captura unificada (`captureAndPurify`) escribe prima materia en `data/raw_documents/pending_purification/` y dispara el pipeline. Invocado desde ingesta (texto, audio post-STT, tablas, visión), diario, documentos y API directa.

**Ubicación:**
- Orquestador: `lib/purifier/engine.ts`, `lib/purifier/capture.ts`
- Tipos y review store: `lib/purifier/types.ts`, `lib/purifier/review-store.ts`
- Aprobación: `lib/purifier/approve.ts`
- API: `app/api/purifier/`
- UI HITL: `app/validar/page.tsx`, `components/validar/`

**Tecnologías/Dependencias:** Todos los sub-agentes anteriores, filesystem (`data/raw_documents/`), Prisma al aprobar.

> **Nota de deuda:** existe `lib/purifier-pipeline.ts` (implementación legacy duplicada) sin importadores activos en el código actual. La fuente de verdad operativa es `lib/purifier/engine.ts`.

---

### ⚖️ Calibrador de Vibe

**Funciones:**
- Construir cola de tarjetas desde fuentes `validated` (proyectos + retos laborales) y `generated` (tareas pendientes reconocidas/calibradas).
- Filtrar por `campoSlug` y límite configurable.
- Registrar sesiones y votos de peso 1–12 en SQLite.
- Completar sesión de calibración humana.

**Descripción:**  
Módulo **HITL de calibración atencional**, no usa LLM. El Observador asigna pesos de gravedad a ítems validados para alinear priorización del sistema. El adaptador `generated` lee `PendingTask` desde El Listador / Calibrador de Tareas.

**Ubicación:**
- Lógica: `lib/vibe-calibrator/` (`build-queue.ts`, `persist.ts`, `adapters/`)
- API: `app/api/vibe-calibrator/`
- UI: `app/calibrador/page.tsx`, `components/vibe-calibrator/`
- DB: migración `prisma/migrations/20260619120000_vibe_calibration/`

**Tecnologías/Dependencias:** Prisma (`VibeCalibrationSession`, `VibeCalibrationVote`), `lib/projects/service`, `lib/laboral/challenges`, `lib/pendientes/store`.

---

### 📋 El Listador

**Funciones:**
- Absorber texto crudo y transcripciones desde ingesta, audio matutino, bitácoras y notas de voz.
- Extraer acciones, compromisos y eventos accionables vía LLM.
- Persistir sugerencias como `PendingTask` (estado `suggested`).
- Deduplicar por título normalizado y `sourceRef` en ventana de 24h.
- Alimentar Tareas Sugeridas en `/pendientes` y asaltos del Grid.

**Ubicación:**
- Lógica: `lib/listador/` (`extract.ts`, `process.ts`)
- Hooks: `lib/purifier/capture.ts`, `app/api/journal/save/route.ts`
- API/UI: `app/api/pendientes/`, `app/pendientes/page.tsx`

**Tecnologías/Dependencias:** Cohere Command R+ (fast), Prisma (`PendingTask`), Zod.

---

### 🎯 Calibrador de Tareas

**Funciones:**
- Calibrar tareas reconocidas con escala estricta 1–12.
- Desvalidar automáticamente votos &lt; 4 (estado `rejected`).
- Priorizar asaltos en la Trinchera del Grid (peso ≥ 10 = Boss del día).
- Nutrir el adapter `generated` del Calibrador de Vibe.

**Descripción:**  
Agente HITL específico del área de tareas. Opera en conjunto con el Validador (reconocer/rechazar) pero es un agente distinto que comparte la misma fuente `PendingTask`.

**Ubicación:**
- Lógica: `lib/pendientes/store.ts` (`calibratePendingTask`)
- API: `app/api/pendientes/[id]/calibrate/route.ts`
- UI: `components/pendientes/task-calibrator-panel.tsx`, pestaña Calibrador en `/pendientes`

**Tecnologías/Dependencias:** Prisma (`PendingTask`), `WeightSlider`, `MIN_CALIBRATION_WEIGHT = 4`.

---

### 🎧 Binauralizer

**Funciones:**
- Generar tonos binaurales en tiempo real con Web Audio API (local-first, sin MP3).
- Configurar dos `OscillatorNode` tipo sine con `StereoPannerNode` (canal L −1, canal R +1).
- Controlar volumen maestro vía `GainNode` (default 0.1).
- Ofrecer presets cognitivos: Gamma Focus (40 Hz), Alpha Flow (10 Hz), Theta Creative (6 Hz), Delta Deep Repair (2 Hz).
- Permitir ajuste manual de portadora (100–500 Hz) y frecuencia binaural (1–50 Hz).
- Clasificar banda de ondas (Delta, Theta, Alpha, Beta, Gamma) según frecuencia de destino.

**Descripción:**  
Agente frontend de modulación cognitiva. El cerebro percibe la diferencia entre frecuencias izquierda y derecha (beat binaural) y puede inducir arrastre neural. Requiere auriculares estéreo. Todo el procesamiento ocurre en el navegador del usuario.

**Ubicación:**
- Motor: `lib/binauralizer/use-binaural-engine.ts`, `lib/binauralizer/presets.ts`, `lib/binauralizer/wave-bands.ts`
- UI: `app/agentes/binauralizer/page.tsx`, `components/binauralizer/`

**Tecnologías/Dependencias:** Web Audio API (`AudioContext`, `OscillatorNode`, `StereoPannerNode`, `GainNode`), React 19.

---

### 🫀 Centinela Somático

**Funciones:**
- Captar ingestas reales desde `/salud` (texto, foto y nota de voz).
- Enrutar a visión Cohere, Deepgram STT y Nutrimetron según modalidad.
- Coordinar el flujo entre Nutrimetron, Kinetómetro y agentes en incubación.

**Ubicación:**
- UI: `components/salud/panels/alimentacion-panel.tsx`
- API: `app/api/salud/ingest/route.ts`, `lib/health/ingest-service.ts`

**Tecnologías/Dependencias:** Prisma (`HealthRecord`, `ContextEvent`), Zod.

---

### 🥑 Nutrimetron

**Funciones:**
- Desglosar ingestas en ítems, macros estimados y metadata de combustible.
- Analizar fotos de comida (visión) y transcripciones de voz (STT).
- Persistir comidas estructuradas en HealthRecord con ayuno intermitente.

**Ubicación:**
- UI: `components/salud/panels/alimentacion-panel.tsx`
- Motor: `lib/health/nutrition-extract.ts`, `lib/health/vision-food.ts`, `lib/health/ingest-service.ts`

**Tecnologías/Dependencias:** Cohere Vision, Deepgram STT, Prisma (`HealthRecord`), `combustibleMetricsSchema`.

---

### 🏃 Kinetómetro

**Funciones:**
- Registrar actividad física con duración, distancia o intensidad.
- Mapear métricas unificadas al schema de rendimiento.
- Alimentar historial de carga física para correlación con energía y foco.

**Ubicación:**
- UI: `components/salud/panels/deporte-panel.tsx`
- Servicio: `lib/health/service.ts`

**Tecnologías/Dependencias:** Prisma (`HealthRecord`), `rendimientoMetricsSchema`.

---

### 📜 Cronista

**Funciones:**
- Materializar ingestas de salud como eventos individuales del calendario.
- Emitir entradas en Historial con categoría `salud`.
- Backfill de eventos faltantes para registros legacy.
- Coordinar con Extractor de Eventos (propuestos HITL), Nutrimetron y Centinela Somático.

**Ubicación:**
- Motor: `lib/cronista/publish.ts`
- Integración: `lib/health/service.ts`, `lib/events/service.ts`
- UI: `/calendario`, `/historial`

**Tecnologías/Dependencias:** Prisma (`ContextEvent`, `ActivityLog`, `HealthRecord`).

---

## 4. Subprocesadores determinísticos del Purifier

Estaciones sin LLM que forman parte del pipeline pero no son agentes semánticos:

| Estación | Nombre | Qué hace | Ubicación |
|----------|--------|----------|-----------|
| 1 | Limpieza Regex | Amputa loops Whisper, elimina oraciones duplicadas consecutivas | `station1RegexCleanup` en `lib/purifier/engine.ts` |
| 3 | Deduplicación | Fusiona párrafos con similitud Jaccard ≥ 0.82 | `station3Deduplicate` |
| 6 | Segmentación Fractal | Divide cuerpo en bloques padre/hijo (4 líneas por hijo) | `station6FractalSegmentation` |

---

## 5. Ingesta y persistencia del Knowledge Graph

Motores **determinísticos** que alimentan el grafo sin llamadas LLM (complementan al Motor de Extracción KG):

| Componente | Función | Ubicación |
|------------|---------|-----------|
| Escáner de código | AST de imports en `app/`, `lib/`, `components/`, `scripts/`, `types/` → nodos `archivo`/`modulo`, aristas `importa` | `lib/kg/code/scan.ts`, `lib/kg/code/ingest.ts` |
| Fuente diario | Ingesta entradas Markdown del diario | `lib/kg/sources/journal.ts` |
| Fuente proyectos | Ingesta frontmatter y metadatos de `.md` en `data/projects/` | `lib/kg/sources/projects.ts` |
| Fuente documentos | Ingesta `data/raw_documents/` | `lib/kg/sources/documents.ts` |
| Master plan | Ingesta `deprocast_master_plan.md` | `lib/kg/sources/master-plan.ts` |
| Incremental | Skip por hash (`KgSource.contentHash`) | `lib/kg/incremental.ts` |

**Scripts de mantenimiento:** `npm run kg:scan`, `npm run kg:backfill` (ver `knowledge-graph.md`).

**Hooks automáticos post-guardado:** diario (`POST /api/journal/save`), proyectos, documentos — ingesta KG no bloqueante.

---

## 6. Agentes en fase de diseño

Los siguientes módulos **no tienen implementación en el repositorio** (búsqueda sin coincidencias en código ni documentación técnica verificable). Se documentan como pipeline de diseño acordado para potenciar el **corpus unificado** del exoesqueleto cognitivo.

### 🩺 Somatometrón

**Funciones previstas:**
- Integrar APIs y sensores biológicos (sueño, HRV, pasos, wearables).
- Normalizar lecturas en fragmentos con las Siete Dimensiones (`onda: personal-health`).
- Correlacionar estado somático con priorización atencional y ventanas de Focus Work.

**Descripción:**  
Especialista en telemetría biológica para la pestaña Telemetría de `/salud`. El módulo manual de salud ya opera vía `HealthRecord`; la integración con wearables y APIs externas está pendiente.

**Ubicación prevista:** `components/salud/panels/telemetria-panel.tsx` · futuro `lib/somatometron/`.

**Tecnologías previstas:** periféricos locales, APIs de sueño/HRV, posible integración NFC/hábitos.

---

### 🌤️ Ambientógrafo

**Funciones previstas:**
- Capturar exposición solar, calidad del aire y contexto ambiental.
- Registrar sesiones de meditación y métricas de bienestar no biométricas.
- Correlacionar entorno con estado base y recuperación.

**Descripción:**  
Especialista reservado para la pestaña Más de `/salud`. Espacio para métricas de entorno que complementen la telemetría somática.

**Ubicación prevista:** `components/salud/panels/mas-panel.tsx` · futuro `lib/ambientografo/`.

**Tecnologías previstas:** APIs meteorológicas, sensores de calidad del aire, entrada manual HITL.

---

### 🎲 LudusDirector

**Funciones previstas:**
- Orquestar mecánicas 4X y dinámicas tipo Reddit sobre el corpus de retos y proyectos.
- Modelar loops de delegación Observador → Jugador → Avatar (Estudianta).
- Generar microtareas atómicas (< 15 min) y Puntos de Señal.

**Descripción:**  
Director de juego para la capa gamificada del ecosistema. El avatar **Estudianta**, Focus Work y Puntos de Señal están especificados en `deprocast_master_plan.md` y referenciados en UI (`components/home/gnosis-metrics.tsx` como “en preparación”), pero sin motor ejecutor ni agente LLM operativo. En producción opera las tres lentes Ludus (Castillo / Campamento / Trinchera) y coordina la cartografía dual (Grafólogo + Cartógrafo + Georreferenciador).

**Ubicación prevista:** futuro `lib/ludus/` o integración con módulo laboral (`app/laboral/`, `app/api/laboral/focus/route.ts` hoy solo expone datos).

**Tecnologías previstas:** cola de microtareas, Prisma (modelos Boss/Microtask/FocusSession aún no implementados), posible señal desde KG y Calibrador de Vibe.

---

### 🧭 Grafólogo del Castillo

**Funciones:**
- Construir el snapshot ego-céntrico (nodo YO + personas, proyectos, cuadernos).
- Mantener el nodo YO fijo como núcleo gravitacional del corpus.
- Buscador semántico con resaltado y atenuación de nodos.
- Filtros rápidos por tipo de entidad (Personas, Proyectos, Cuadernos).
- Deep links a `/grafo`, `/proyectos` e `/ingesta/cuadernos` desde nodos del mapa.

**Descripción:**  
Especialista del plano mental/conceptual. Renderiza el grafo semántico del Castillo con React Flow.

**Ubicación:** `lib/castillo/semantic-map.ts`, `app/api/castillo/semantic-map/route.ts`, `components/castillo/castillo-semantic-map.tsx`.

**Tecnologías:** `@xyflow/react`, Prisma (`KgNode`, `KgEdge`, `Notebook`), Babel (filtro de universo).

**Ruta UI:** `/ludus/castillo` (vista Mapa).

---

### 🗺️ Cartógrafo del Campamento

**Funciones:**
- Renderizar marcadores permanentes (`isPermanent`) en React Leaflet con tiles oscuros.
- Pintar marcadores temporales desde `GET /api/campamento/geo` según rango Babel.
- Popup con detalle del bloque y acción HITL: completar tarea o confirmar evento.
- Sincronizar invalidación con `bumpTemporal()` tras acciones desde el mapa.
- Filtros Hoy | Esta semana alineados al planificador.

**Descripción:**  
Especialista del plano físico/temporal. Superpone capa fija (hitos) y capa dinámica (eventos/tareas geolocalizados).

**Ubicación:** `lib/geo/campamento-map.ts`, `app/api/campamento/geo/route.ts`, `components/ludus/campamento/campamento-geo-map.tsx`.

**Tecnologías:** `react-leaflet`, Leaflet, CartoDB Dark Matter, `lib/temporal`.

**Ruta UI:** `/ludus/campamento` (vista Mapa).

---

### 📍 Georreferenciador

**Funciones:**
- Geocodificar direcciones vía Nominatim con cache y User-Agent identificable.
- Seed de hitos permanentes (Varona HQ, Casa) desde variables de entorno.
- CRUD de ubicaciones en `GeoLocation` y endpoint `POST /api/geo/geocode`.
- Enriquecer `structuredData.location` de eventos al resolver coordenadas.
- Rechazar coordenadas inventadas si el geocode falla.

**Descripción:**  
Puente geográfico compartido. Resuelve direcciones a coordenadas y persiste `GeoLocation`.

**Ubicación:** `lib/geo/geocode.ts`, `lib/geo/service.ts`, `app/api/geo/locations/route.ts`, `app/api/geo/geocode/route.ts`.

**Tecnologías:** Nominatim (OpenStreetMap), Prisma (`GeoLocation`), Zod.

**Ruta UI:** infra compartida (sin UI propia); consumido desde Campamento.

---

### 🧬 Mnemosyne

**Funciones previstas:**
- Archivar y re-hidratar **memoria líquida**: contexto de largo plazo no rígido, re-indexable.
- Gestionar compostaje continuo de fragmentos (re-pesado, re-encadenamiento).
- Servir como capa de memoria para el Exocórtex más allá del historial de 10 turnos y la búsqueda híbrida actual.

**Descripción:**  
Subsistema de archivado de memoria líquida para el corpus unificado. Hoy el grafo (`KgMention`, `confidence`, `context` en aristas) y los chunks fractales del Purifier son el sustrato más cercano, pero **sin embeddings vectoriales ni RAG operativo** (brecha documentada en `datainfo.md`). Mnemosyne cerraría el loop Información → Conocimiento → Sabiduría.

**Ubicación prevista:** extensión sobre `lib/kg/` + almacén vectorial local (no implementado).

**Tecnologías previstas:** embeddings locales, `ParentChunk`/`ChildChunk` (modelos legacy en Prisma), integración con Exocórtex y Purifier post-aprobación.

---

## Apéndice: rutas de UI por agente

| Ruta | Agente / módulo |
|------|-----------------|
| `/` | Grid Home (Trinchera / Asaltos) |
| `/cortex` | Córtex Dashboard |
| `/pendientes` | El Listador + Calibrador de Tareas |
| `/calendario` | Eventos del día |
| `/chat` | Exocórtex Interactivo |
| `/ingesta` | Captura → Purifier / Visión |
| `/validar` | HITL Purifier |
| `/grafo` | Visualización KG |
| `/calibrador` | Calibrador de Vibe |
| `/agentes/binauralizer` | Binauralizer |
| `/ludus` | LudusDirector |
| `/ludus/castillo` | Grafólogo del Castillo (vista Mapa) |
| `/ludus/campamento` | Planificador + Cartógrafo del Campamento |
| `/ludus/trinchera` | Foco de Trinchera |
| `/diario` | Diario → Purifier + KG |
| `/audio/[id]` | Motor STT + revisión de transcripción |

---

*Este documento debe actualizarse cuando se añada, renombre o retire un agente en el código. Ante conflicto con otro `.md`, prevalece la verificación directa del repositorio.*
