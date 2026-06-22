/**
 * Catálogo estático alineado con agentes.md (Única Fuente de Verdad).
 * Actualizar en paralelo cuando cambie la documentación.
 */

export type OperationalAgent = {
  id: string;
  emoji: string;
  name: string;
  badge: string;
  badgeTone: "cyan" | "emerald" | "violet" | "amber" | "zinc" | "rose";
  locations: string[];
  functions: string[];
  technologies: string[];
  uiRoute?: string;
};

export type Subprocessor = {
  id: string;
  station: string;
  name: string;
  description: string;
  location: string;
};

export type KgIngestSource = {
  id: string;
  name: string;
  description: string;
  locations: string[];
};

export type DesignAgent = {
  id: string;
  emoji: string;
  name: string;
  subtitle: string;
  plannedFunctions: string[];
  description: string;
  plannedLocation: string;
  plannedTechnologies: string[];
};

export const OPERATIONAL_AGENTS: OperationalAgent[] = [
  {
    id: "exocortex",
    emoji: "🧠",
    name: "Exocórtex Interactivo",
    badge: "LLM · Vertex Gemini",
    badgeTone: "cyan",
    locations: [
      "lib/chat/engine.ts",
      "lib/chat/context-retriever.ts",
      "lib/chat/hybrid-search.ts",
      "lib/chat/prompts.ts",
      "lib/chat/service.ts",
      "lib/chat/mention-index.ts",
      "app/api/chat/send/route.ts",
      "app/chat/page.tsx",
    ],
    functions: [
      "Recibir mensajes del usuario con segmentos de texto y menciones @ tipadas.",
      "Resolver menciones a proyectos, retos, áreas, personas, campos y retos laborales.",
      "Ejecutar búsqueda híbrida (menciones KG, aristas, diario) sobre la consulta en lenguaje natural.",
      "Inyectar bloques de contexto truncados en el system prompt.",
      "Mantener historial de sesión (últimos 10 turnos) y persistir intercambios en SQLite.",
      "Generar título automático de sesión en el primer mensaje.",
    ],
    technologies: [
      "Vertex AI Gemini",
      "Prisma (ChatSession, ChatMessage)",
      "lib/kg/queries",
      "lib/projects/service",
      "lib/laboral/challenges",
      "lib/journal/",
    ],
    uiRoute: "/chat",
  },
  {
    id: "stt",
    emoji: "🎙️",
    name: "Motor de Transcripción STT",
    badge: "Determinístico · Chirp_2",
    badgeTone: "emerald",
    locations: [
      "lib/gcp-speech-processor.ts",
      "lib/processing-queue.ts",
      "lib/gcp-speech/",
      "app/api/upload/route.ts",
      "app/api/process/",
      "app/audio/[id]/page.tsx",
    ],
    functions: [
      "Encolar AudioAsset en cola in-process (ProcessingQueue).",
      "Convertir audio a WAV con FFmpeg/FFprobe.",
      "Transcribir sincrónicamente o por chunks según duración.",
      "Persistir Transcript.rawText y actualizar estado del asset.",
      "Guardar transcripciones parciales ante fallos recuperables.",
    ],
    technologies: [
      "@google-cloud/speech",
      "FFmpeg (ffmpeg-static, ffprobe-static)",
      "Prisma (AudioAsset, Transcript)",
      "GCP_SPEECH_*",
    ],
    uiRoute: "/audio/[id]",
  },
  {
    id: "vision",
    emoji: "👁️",
    name: "Agente de Visión OCR",
    badge: "Multimodal",
    badgeTone: "violet",
    locations: [
      "lib/ingesta/vision/extract.ts",
      "app/api/ingesta/vision/route.ts",
      "components/ingesta/channels/vision-channel.tsx",
    ],
    functions: [
      "Aceptar imágenes (PNG, JPG, WEBP, GIF, HEIC) y PDF.",
      "Almacenar binario original en data/tacho/.",
      "Enviar contenido multimodal (inline base64) a Gemini con VISION_EXTRACTION_PROMPT.",
      "Devolver Markdown purificado (tachones, descripción analítica de diagramas).",
      "Opcionalmente confirmar contexto y anexarlo como .md al proyecto destino.",
      "Encadenar captura → Purifier vía captureAndPurify.",
    ],
    technologies: [
      "Vertex AI Gemini (inlineData)",
      "data/tacho/",
      "lib/purifier/capture.ts",
    ],
    uiRoute: "/ingesta",
  },
  {
    id: "editor-semantico",
    emoji: "✂️",
    name: "Editor Semántico STT",
    badge: "Purifier · Estación 2",
    badgeTone: "cyan",
    locations: ["lib/purifier/engine.ts (station2SemanticCleanup)"],
    functions: [
      "Recibir texto post-limpieza regex (Estación 1).",
      "Eliminar muletillas vacías sin alterar significado.",
      "Corregir puntuación y oralidad → prosa escrita.",
      "Marcar segmentos incomprensibles como ==DUDA: fragmento==.",
      "Preservar bloques ==DUDA:...== preexistentes.",
    ],
    technologies: ["Vertex AI Gemini", "runPurificationPipeline"],
  },
  {
    id: "extractor-esencias",
    emoji: "🏷️",
    name: "Extractor de Esencias",
    badge: "Purifier · Estación 4",
    badgeTone: "cyan",
    locations: [
      "lib/purifier/engine.ts (station4ExtractEssences)",
    ],
    functions: [
      "Analizar texto deduplicado (Estación 3).",
      "Devolver array JSON de conceptos atómicos (nombres propios, leyes, bugs, tecnologías, procesos).",
      "Limitar salida a 30 tags máximo con fallback de parseo tolerante.",
    ],
    technologies: ["Vertex AI Gemini", "EXTRACT_ESSENCES_PROMPT"],
  },
  {
    id: "motor-kg",
    emoji: "🕸️",
    name: "Motor de Extracción KG",
    badge: "Purifier · Estación 4.1",
    badgeTone: "cyan",
    locations: [
      "lib/kg/extract.ts",
      "lib/kg/prompts.ts",
      "lib/kg/parse.ts",
      "lib/kg/ingest.ts",
      "lib/purifier/engine.ts",
      "app/api/kg/ingest/route.ts",
    ],
    functions: [
      "Analizar texto purificado y devolver JSON estructurado de entidades y relaciones.",
      "Tipificar nodos (persona, proyecto, idea, tecnologia, etc.) con aliases y personaKind.",
      "Exigir context obligatorio en cada relación y weight 1–12.",
      "Parsear y validar respuesta (parseLlmKgExtraction).",
      "Ingerir resultado en SQLite cuando extractKg: true.",
    ],
    technologies: [
      "Vertex AI Gemini",
      "Prisma (KgNode, KgEdge, KgMention, KgSource)",
      "SQLite local",
    ],
    uiRoute: "/grafo",
  },
  {
    id: "archivista",
    emoji: "📜",
    name: "Archivista Deprocast",
    badge: "Purifier · Estación 5",
    badgeTone: "cyan",
    locations: [
      "lib/purifier/engine.ts (station5Normalize)",
    ],
    functions: [
      "Recibir texto purificado + meta tags + vectores de gravedad sugeridos.",
      "Generar Markdown completo con frontmatter YAML de las Siete Dimensiones.",
      "Asignar prioridad, impacto, dificultad (1–12), title, particula.",
      "Preservar marcadores ==DUDA:...== en el cuerpo.",
      "Parsear frontmatter resultante para construir PurifierReviewRecord.",
    ],
    technologies: [
      "Vertex AI Gemini",
      "lib/projects/priority",
      "lib/projects/campos",
    ],
  },
  {
    id: "orquestador",
    emoji: "🔥",
    name: "Orquestador Purifier",
    badge: "Pipeline · Mixto",
    badgeTone: "amber",
    locations: [
      "lib/purifier/engine.ts",
      "lib/purifier/capture.ts",
      "lib/purifier/types.ts",
      "lib/purifier/review-store.ts",
      "lib/purifier/approve.ts",
      "app/api/purifier/",
    ],
    functions: [
      "Ejecutar secuencialmente estaciones 1 → 6 (+ 4.1 opcional).",
      "Resolver gravedad de entrada (GravityInput) y fuente KG.",
      "Registrar snapshot por estación (PurifierStageSnapshot[]) en schema v2.",
      "Persistir revisión en data/raw_documents/review/{reviewId}.json.",
      "Exponer aprobación HITL (approveAndCoagulate, approveToProposal).",
    ],
    technologies: [
      "Vertex AI Gemini",
      "Filesystem (data/raw_documents/)",
      "Prisma al aprobar",
    ],
    uiRoute: "/validar",
  },
  {
    id: "calibrador",
    emoji: "⚖️",
    name: "Calibrador de Vibe",
    badge: "HITL · Sin LLM",
    badgeTone: "rose",
    locations: [
      "lib/vibe-calibrator/",
      "app/api/vibe-calibrator/",
      "app/calibrador/page.tsx",
      "prisma/migrations/20260619120000_vibe_calibration/",
    ],
    functions: [
      "Construir cola de tarjetas desde fuentes validated y generated (stub vacío).",
      "Filtrar por campoSlug y límite configurable.",
      "Registrar sesiones y votos de peso 1–12 en SQLite.",
      "Completar sesión de calibración humana.",
    ],
    technologies: [
      "Prisma (VibeCalibrationSession, VibeCalibrationVote)",
      "lib/projects/service",
      "lib/laboral/challenges",
    ],
    uiRoute: "/calibrador",
  },
];

export const SUBPROCESSORS: Subprocessor[] = [
  {
    id: "s1",
    station: "Est. 1",
    name: "Limpieza Regex",
    description:
      "Amputa loops Whisper, elimina oraciones duplicadas consecutivas",
    location: "station1RegexCleanup · lib/purifier/engine.ts",
  },
  {
    id: "s3",
    station: "Est. 3",
    name: "Deduplicación Jaccard",
    description:
      "Fusiona párrafos con similitud Jaccard ≥ 0.82",
    location: "station3Deduplicate · lib/purifier/engine.ts",
  },
  {
    id: "s6",
    station: "Est. 6",
    name: "Segmentación Fractal",
    description:
      "Divide cuerpo en bloques padre/hijo (4 líneas por hijo)",
    location: "station6FractalSegmentation · lib/purifier/engine.ts",
  },
];

export const KG_INGEST_SOURCES: KgIngestSource[] = [
  {
    id: "code-scanner",
    name: "Escáner de código AST",
    description:
      "Imports en app/, lib/, components/ → nodos archivo/modulo, aristas importa",
    locations: ["lib/kg/code/scan.ts", "lib/kg/code/ingest.ts"],
  },
  {
    id: "journal",
    name: "Fuente diario",
    description: "Ingesta entradas Markdown del diario",
    locations: ["lib/kg/sources/journal.ts"],
  },
  {
    id: "projects",
    name: "Fuente proyectos",
    description:
      "Ingesta frontmatter y metadatos de .md en data/projects/",
    locations: ["lib/kg/sources/projects.ts"],
  },
];

export const DESIGN_AGENTS: DesignAgent[] = [
  {
    id: "somatometron",
    emoji: "🩺",
    name: "Somatometrón",
    subtitle: "Telemetría Biológica / Salud",
    plannedFunctions: [
      "Capturar telemetría de salud del Observador (biométrica, hábitos, señales fisiológicas).",
      "Normalizar lecturas en fragmentos con las Siete Dimensiones (onda: personal-health).",
      "Correlacionar estado somático con priorización atencional y ventanas de Focus Work.",
    ],
    description:
      "Módulo de telemetría de salud para cerrar el circuito entre cuerpo y atención. Sin API, schema Prisma ni rutas implementadas.",
    plannedLocation:
      "daemon local + data/tacho/ · futuro lib/somatometron/ (inexistente)",
    plannedTechnologies: [
      "Periféricos locales",
      "NFC/hábitos (field: nfc-habit-loop)",
      "Ingestión vía Purifier",
    ],
  },
  {
    id: "ludus",
    emoji: "🎲",
    name: "LudusDirector",
    subtitle: "Simulación 4X / Reddit / Estudianta",
    plannedFunctions: [
      "Orquestar mecánicas 4X y dinámicas tipo Reddit sobre el corpus de retos y proyectos.",
      "Modelar loops de delegación Observador → Jugador → Avatar (Estudianta).",
      "Generar microtareas atómicas (< 15 min) y Puntos de Señal.",
    ],
    description:
      "Director de juego para la capa gamificada. Estudianta y Focus Work especificados en grimorio; sin motor ejecutor operativo.",
    plannedLocation:
      "futuro lib/ludus/ · app/laboral/ · app/api/laboral/focus/route.ts",
    plannedTechnologies: [
      "Cola de microtareas",
      "Prisma (Boss/Microtask/FocusSession — pendiente)",
      "Señal desde KG y Calibrador de Vibe",
    ],
  },
  {
    id: "mnemosyne",
    emoji: "🧬",
    name: "Mnemosyne",
    subtitle: "Memoria Líquida / Embeddings locales",
    plannedFunctions: [
      "Archivar y re-hidratar memoria líquida: contexto de largo plazo re-indexable.",
      "Gestionar compostaje continuo de fragmentos (re-pesado, re-encadenamiento).",
      "Servir como capa de memoria para el Exocórtex más allá del historial de 10 turnos.",
    ],
    description:
      "Subsistema de archivado de memoria líquida. Sin embeddings vectoriales ni RAG operativo; cerraría el loop Información → Conocimiento → Sabiduría.",
    plannedLocation:
      "extensión lib/kg/ + almacén vectorial local (no implementado)",
    plannedTechnologies: [
      "Embeddings locales",
      "ParentChunk/ChildChunk (Prisma legacy)",
      "Integración Exocórtex + Purifier post-aprobación",
    ],
  },
];

export const ECOSYSTEM_STATS = {
  operationalCount: OPERATIONAL_AGENTS.length,
  subprocessorsCount: SUBPROCESSORS.length,
  kgSourcesCount: KG_INGEST_SOURCES.length,
  designCount: DESIGN_AGENTS.length,
  llmProvider: "gemini-2.5-flash",
  docSource: "agentes.md",
} as const;
