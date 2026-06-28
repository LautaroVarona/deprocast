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
      "lib/audio-station/",
      "app/api/upload/route.ts",
      "app/api/process/",
      "app/api/audio-station/",
      "app/audio/page.tsx",
      "app/audio/[id]/page.tsx",
    ],
    functions: [
      "Biblioteca central de AudioAsset importados con drag-and-drop.",
      "Pre-procesamiento: escaneo de duplicados por nombre, sufijo (1)(2) y colisión numérica.",
      "Acción HITL post-escaneo: eliminar copias o procesarlas igual.",
      "Encolar AudioAsset en cola in-process (ProcessingQueue).",
      "Convertir audio a WAV con FFmpeg/FFprobe.",
      "Transcribir sincrónicamente o por chunks según duración.",
      "Persistir Transcript.rawText y actualizar estado del asset.",
      "Guardar transcripciones parciales ante fallos recuperables.",
      "Mapa downstream hacia Purifier, Molecular y Grafo.",
    ],
    technologies: [
      "@google-cloud/speech",
      "FFmpeg (ffmpeg-static, ffprobe-static)",
      "Prisma (AudioAsset, Transcript)",
      "GCP_SPEECH_*",
    ],
    uiRoute: "/audio",
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
  {
    id: "enciclopediador",
    emoji: "📖",
    name: "Enciclopediador",
    badge: "LLM · Enciclopedia generativa",
    badgeTone: "amber",
    locations: [
      "lib/enciclopedia/",
      "app/api/enciclopedia/",
      "components/enciclopedia/",
      "app/enciclopedia/page.tsx",
      "prisma/migrations/20260628120000_encyclopedia/",
    ],
    functions: [
      "Generar entradas enciclopédicas a partir de conceptos, ideas o preguntas.",
      "Sugerir términos explorables y permitir exploración manual por selección de texto.",
      "Visualizar el camino de aprendizaje del usuario como grafo interactivo de sesión.",
      "Vincular entradas opcionalmente al Corpus (KG) hacia proyectos, personas, áreas y conceptos.",
      "Recibir validación y reportes HITL para mejorar futuras respuestas.",
    ],
    technologies: [
      "Vertex AI Gemini",
      "Prisma (EncyclopediaEntry, EncyclopediaEdge, EncyclopediaReport)",
      "lib/kg/sources/common (ingestDocumentSource)",
      "Canvas force-directed (grafo de sesión)",
    ],
    uiRoute: "/enciclopedia",
  },
  {
    id: "cam-recorder-watcher",
    emoji: "📹",
    name: "Cam-Recorder-Watcher",
    badge: "Mock · NDJSON stream",
    badgeTone: "emerald",
    locations: [
      "lib/cam-recorder-watcher/",
      "app/api/cam-recorder/",
      "components/cam-recorder/",
      "app/cam-recorder/page.tsx",
    ],
    functions: [
      "Ingerir screen recordings (.mp4, .m4v, .mov, .webm, .mkv) vía drag-and-drop.",
      "Simular análisis visual y emitir notas cronológicas con timestamp, app activa y nivel de foco 1–12.",
      "Transmitir logs de conciencia en tiempo real (NDJSON) mientras el video se procesa.",
      "Inyectar bloque consolidado a data/cam-recorder-watcher/ para Calibrador Molecular y auditoría de Jornada.",
    ],
    technologies: [
      "ReadableStream NDJSON",
      "data/cam-recorder-watcher/",
      "Integración Molecular + Jornada",
    ],
    uiRoute: "/cam-recorder",
  },
  {
    id: "meta-meteador",
    emoji: "🏷️",
    name: "Meta-Meteador",
    badge: "LLM · Vertex Gemini",
    badgeTone: "violet",
    locations: [
      "lib/meta-meteador/engine.ts",
      "lib/meta-meteador/prompt.ts",
      "lib/meta-meteador/types.ts",
      "lib/meta-meteador/parse.ts",
      "app/api/agentes/meta-meteador/route.ts",
      "components/agentes/meta-meteador-panel.tsx",
      "components/agentes/meta-meteador-modal.tsx",
    ],
    functions: [
      "Revisar documentos validados (.md en data/projects) en lote.",
      "Asignar título de 3–7 palabras si el actual es auto-generado (sin-titulo, .md, timestamp).",
      "Conservar títulos asignados manualmente por el usuario.",
      "Extraer matriz cuántica (Materia, Partícula, Campo, Onda, Tiempo-Espacio, Posición).",
      "Ponderar relevancia 1–12 para Salud, Legal, Finanzas, Tecnología, Arte y Comunidad.",
      "Persistir metadatos desacoplados en DocumentMeta (SQLite) vinculados por documentId.",
      "Proyectar nodos tipo area y aristas relevante_para al grafo (toggleable).",
    ],
    technologies: [
      "Vertex AI Gemini",
      "Prisma (DocumentMeta)",
      "lib/kg/ingest",
      "lib/projects/service",
    ],
    uiRoute: "/agentes",
  },
  {
    id: "ludus",
    emoji: "🎲",
    name: "LudusDirector",
    badge: "Gamificación · Castillo",
    badgeTone: "amber",
    locations: [
      "lib/castillo/",
      "lib/ludus/",
      "app/ludus/",
      "app/api/castillo/",
      "components/castillo/",
      "components/ludus/",
    ],
    functions: [
      "Modo videojuego con mapa de áreas: Castillo, Campamento y Trinchera.",
      "Canvas futurista (Castillo) para clasificar libremente todo el corpus validado.",
      "Catálogo multi-fuente: Córtex, KG, cuadernos, eventos, enciclopedia y bookmarks.",
      "Persistencia de layout y tags en CastleGrid/CastleCard con trazabilidad vía ContextEvent.",
    ],
    technologies: [
      "react-grid-layout",
      "Prisma (CastleGrid, CastleCard)",
      "Agregador lib/castillo/catalog.ts",
    ],
    uiRoute: "/ludus",
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
