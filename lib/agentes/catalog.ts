/**
 * Catálogo estático alineado con docs/agentes.md (Única Fuente de Verdad).
 * Actualizar en paralelo cuando cambie la documentación.
 */

export type AgentStatus = "operational" | "design" | "subprocessor";

export type OperationalAgent = {
  id: string;
  emoji: string;
  name: string;
  badge: string;
  badgeTone: "cyan" | "emerald" | "violet" | "amber" | "zinc" | "rose";
  status?: AgentStatus;
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
  status?: AgentStatus;
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
    badge: "LLM · Cohere Command R+",
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
      "Ejecutar búsqueda híbrida (léxica + Mnemosyne vectorial + Cohere Rerank) sobre la consulta.",
      "Inyectar bloques de contexto truncados en el system prompt.",
      "Mantener historial de sesión (últimos 10 turnos) y persistir intercambios en SQLite.",
      "Generar título automático de sesión en el primer mensaje.",
    ],
    technologies: [
      "Cohere Command R+",
      "Prisma (ChatSession, ChatMessage)",
      "lib/kg/queries",
      "lib/projects/service",
      "lib/laboral/challenges",
      "lib/mnemosyne/",
      "lib/journal/",
    ],
    uiRoute: "/chat",
  },
  {
    id: "stt",
    emoji: "🎙️",
    name: "Motor de Transcripción STT",
    badge: "Determinístico · Deepgram",
    badgeTone: "emerald",
    locations: [
      "lib/deepgram-speech-processor.ts",
      "lib/processing-queue.ts",
      "lib/deepgram/",
      "lib/stt/",
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
      "@deepgram/sdk",
      "FFmpeg (ffmpeg-static, ffprobe-static)",
      "Prisma (AudioAsset, Transcript)",
      "DEEPGRAM_*",
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
      "Enviar imágenes/PDF rasterizado a Cohere Command A Vision con VISION_EXTRACTION_PROMPT.",
      "Devolver Markdown purificado (tachones, descripción analítica de diagramas).",
      "Opcionalmente confirmar contexto y anexarlo como .md al proyecto destino.",
      "Encadenar captura → Purifier vía captureAndPurify.",
    ],
    technologies: [
      "Cohere Command A Vision",
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
    technologies: ["Cohere Command R+", "runPurificationPipeline"],
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
    technologies: ["Cohere Command R", "EXTRACT_ESSENCES_PROMPT"],
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
      "Cohere Command R+",
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
      "Cohere Command R+",
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
      "Cohere Command R+",
      "Filesystem (data/raw_documents/)",
      "Prisma al aprobar",
    ],
    uiRoute: "/validar",
  },
  {
    id: "babel-universes",
    emoji: "🌌",
    name: "Universos de Babel",
    badge: "Local · Plano de proyección",
    badgeTone: "violet",
    locations: [
      "lib/babel/",
      "app/api/universos/",
      "app/api/babel/records/",
      "components/babel/babel-context.tsx",
      "hooks/use-temporal-data.ts",
      "prisma/migrations/20260710120000_babel_universes/",
    ],
    functions: [
      "Almacenar toda materia prima en el registro raíz BabelRecord con sello de contexto.",
      "Descubrir planos de proyección (Universos) sin nuevas bases de datos.",
      "Filtrar tareas, eventos y registros por universo activo vía BabelProvider.",
      "Sincronizar universo activo y día seleccionado entre Calendario, Ludus y Pendientes.",
      "Calibrar prioridad de trinchera por universo (1–12) y boostear asaltos.",
      "Invalidar vistas temporales con bumpTemporal() tras mutaciones cruzadas.",
    ],
    technologies: [
      "Prisma (Universe, BabelRecord)",
      "SQLite + data/universes/{slug}/.universo.json",
      "lib/babel/context-seal.ts",
      "lib/babel/universe-fetch.ts",
      "BabelProvider (temporalVersion)",
    ],
    uiRoute: "/ludus/campamento",
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
      "Construir cola de tarjetas desde fuentes validated y generated (PendingTask).",
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
    id: "listador",
    emoji: "📋",
    name: "El Listador",
    badge: "LLM · Extracción de tareas",
    badgeTone: "cyan",
    locations: [
      "lib/listador/extract.ts",
      "lib/listador/process.ts",
      "app/api/journal/save/route.ts",
      "app/api/pendientes/route.ts",
    ],
    functions: [
      "Extraer tareas desde entradas del diario (hook en journal/save).",
      "Identificar acciones, compromisos y bloques de trabajo en lenguaje natural.",
      "Persistir sugerencias como PendingTask con estado suggested y universeSlug.",
      "Deduplicar tareas por título y sourceRef en ventana de 24h.",
      "Alimentar la sección Sugeridas de la Trinchera y el backlog del Planificador.",
      "Complementa al Extractor Trailing (audio/ingesta) — no se engancha desde captureAndPurify.",
    ],
    technologies: [
      "Cohere Command R+ (fast)",
      "Prisma (PendingTask)",
      "lib/pendientes/store.ts",
      "Zod",
    ],
    uiRoute: "/pendientes",
  },
  {
    id: "task-calibrator",
    emoji: "🎯",
    name: "Calibrador de Tareas",
    badge: "HITL · Escala 1–12",
    badgeTone: "rose",
    locations: [
      "lib/task-calibrator/constants.ts",
      "lib/pendientes/store.ts",
      "app/api/pendientes/[id]/calibrate/route.ts",
      "components/pendientes/task-calibrator-panel.tsx",
      "lib/vibe-calibrator/adapters/generated.ts",
    ],
    functions: [
      "Evaluar urgencia e importancia de tareas reconocidas con escala 1–12.",
      "Desvalidar automáticamente votos menores a 4.",
      "Priorizar asaltos en la Trinchera según peso calibrado y boost de universo.",
      "Alimentar la sección Obligatorias del foco diario en Ludus.",
      "Nutrir el adapter generated del Calibrador de Vibe con PendingTask.",
      "Trabajar en conjunto con el Validador de tareas sin duplicar agentes.",
    ],
    technologies: [
      "Prisma (PendingTask)",
      "components/vibe-calibrator/weight-slider.tsx",
      "lib/document-constants (MIN/MAX_BASE_WEIGHT)",
    ],
    uiRoute: "/pendientes",
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
      "Cohere Command R+",
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
    badge: "LLM · Cohere Command R+",
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
      "Cohere Command R+",
      "Prisma (DocumentMeta)",
      "lib/kg/ingest",
      "lib/projects/service",
    ],
    uiRoute: "/agentes",
  },
  {
    id: "binauralizer",
    emoji: "🎧",
    name: "Binauralizer",
    badge: "Web Audio API · Local-first",
    badgeTone: "amber",
    locations: [
      "lib/binauralizer/use-binaural-engine.ts",
      "lib/binauralizer/presets.ts",
      "lib/binauralizer/wave-bands.ts",
      "components/binauralizer/binauralizer-workspace.tsx",
      "app/agentes/binauralizer/page.tsx",
    ],
    functions: [
      "Generar tonos binaurales en tiempo real con Web Audio API (sin archivos MP3).",
      "Separar osciladores sine en canales estéreo vía StereoPannerNode (L/R).",
      "Ofrecer presets cognitivos (Gamma, Alpha, Theta, Delta) y sliders custom.",
      "Clasificar frecuencia de destino en bandas Delta/Theta/Alpha/Beta/Gamma.",
      "Controlar volumen maestro con GainNode a nivel seguro por defecto.",
    ],
    technologies: [
      "Web Audio API",
      "React 19",
      "OscillatorNode",
      "StereoPannerNode",
      "GainNode",
    ],
    uiRoute: "/agentes/binauralizer",
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
      "Orquestar tres lentes temporales: Castillo (macro), Campamento (meso) y Trinchera (micro).",
      "Castillo: vision board con canvas, tarjetas proyecto/visión y proyectos consolidados.",
      "Campamento: planificador semanal/mensual con drag & drop de tareas y eventos.",
      "Trinchera: foco diario Ayer/Hoy/Mañana + asaltos + Laboratorio Sonoro integrado.",
      "Compartir SSOT temporal con Calendario vía BabelProvider y useTemporalData.",
      "Persistencia de layout y tags en CastleGrid/CastleCard con trazabilidad vía ContextEvent.",
      "Cartografía dual: grafo semántico (Castillo) + mapa geográfico (Campamento).",
      "Coordinar Grafólogo, Cartógrafo y Georreferenciador bajo las lentes Alpha/Beta/Gamma.",
    ],
    technologies: [
      "react-grid-layout",
      "Prisma (CastleGrid, CastleCard, LudusAssaultSession)",
      "lib/temporal/*",
      "hooks/use-temporal-data.ts",
      "Agregador lib/castillo/catalog.ts",
    ],
    uiRoute: "/ludus",
  },
  {
    id: "extractor-trailing",
    emoji: "🎬",
    name: "Extractor de Comandos Trailing",
    badge: "LLM · Audio e ingesta",
    badgeTone: "cyan",
    locations: [
      "lib/trailing-commands/extract.ts",
      "lib/trailing-commands/process.ts",
      "lib/purifier/capture.ts",
    ],
    functions: [
      "Extraer compromisos y comandos al final de transcripciones y capturas.",
      "Crear PendingTask y eventos de calendario desde audio/ingesta vía captureAndPurify.",
      "Resolver fechas relativas (hoy, mañana, días de semana) y horarios.",
      "Alimentar el planificador de Campamento y el calendario general.",
      "Complementa a El Listador (enganchado solo desde diario).",
    ],
    technologies: [
      "Cohere Command R+ (fast)",
      "lib/pendientes/store.ts",
      "lib/events/service.ts",
    ],
    uiRoute: "/pendientes",
  },
  {
    id: "extractor-eventos",
    emoji: "📅",
    name: "Extractor de Eventos Contextuales",
    badge: "LLM · Salud y proyectos",
    badgeTone: "violet",
    locations: [
      "lib/events/extract.ts",
      "lib/events/process.ts",
      "app/api/journal/save/route.ts",
      "lib/chat/engine.ts",
    ],
    functions: [
      "Proponer eventos de salud, proyecto y general desde diario y chat.",
      "Persistir ContextEvent con workflow HITL (proposed → confirmed).",
      "Vincular entidades (proyectos, journal, chat_message) vía ContextEventLink.",
      "Alimentar el calendario y el planificador semanal de Campamento.",
      "Coordinar con Cronista para eventos confirmados de telemetría de salud.",
    ],
    technologies: [
      "Cohere Command R+ (fast)",
      "Prisma (ContextEvent, ContextEventLink)",
      "lib/events/extract.ts",
      "lib/events/service.ts",
      "lib/temporal/queries.ts",
    ],
    uiRoute: "/calendario",
  },
  {
    id: "vision-atomica",
    emoji: "🔬",
    name: "Agente de Visión Atómica",
    badge: "Multimodal · Cuadernos",
    badgeTone: "violet",
    locations: [
      "lib/cuadernos/vision-agent.ts",
      "app/api/cuadernos/pages/[pageId]/process/route.ts",
    ],
    functions: [
      "OCR de páginas manuscritas en cuadernos (distinto del OCR de ingesta).",
      "Extraer texto atómico por página con Cohere Vision.",
      "Opcionalmente encadenar captureAndPurify para purificación del contenido.",
    ],
    technologies: ["Cohere Vision", "Prisma (NotebookPage)"],
    uiRoute: "/cuadernos",
  },
  {
    id: "chunkeador-semantico",
    emoji: "🧩",
    name: "Chunkeador Semántico",
    badge: "Determinístico · Molecular",
    badgeTone: "zinc",
    locations: [
      "lib/molecular-processing/semantic-chunker.ts",
      "components/molecular/semantic-chunker-panel.tsx",
    ],
    functions: [
      "Segmentar corpus en partículas semánticas para calibración molecular.",
      "Preparar bloques para el Calibrador Central (ejes X/Y/Z).",
    ],
    technologies: ["lib/molecular-processing/"],
    uiRoute: "/molecular",
  },
  {
    id: "calibrador-central",
    emoji: "⚖️",
    name: "Calibrador Central",
    badge: "HITL · Ejes moleculares",
    badgeTone: "rose",
    locations: [
      "lib/molecular-processing/calibrator.ts",
      "app/api/molecular/validate/route.ts",
      "components/molecular/calibrator-panel.tsx",
    ],
    functions: [
      "Proponer ejes X/Y/Z para cada partícula semántica.",
      "Validación HITL de la posición molecular en el espacio de conocimiento.",
    ],
    technologies: ["lib/molecular-processing/store.ts", "data/molecular/"],
    uiRoute: "/molecular",
  },
  {
    id: "incubador-atanor",
    emoji: "🔥",
    name: "Incubador del Atanor",
    badge: "LLM · Nuevos proyectos",
    badgeTone: "amber",
    locations: [
      "lib/projects/incubation/",
      "app/proyectos/nuevo/",
    ],
    functions: [
      "Entrevista conversacional para incubar nuevos proyectos.",
      "Extraer campos, prioridades y contexto desde diálogo con el usuario.",
    ],
    technologies: [
      "Cohere Command R+",
      "Prisma (ProjectIncubationSession)",
    ],
    uiRoute: "/proyectos/nuevo",
  },
  {
    id: "mnemosyne",
    emoji: "🧬",
    name: "Mnemosyne",
    badge: "Embeddings · Memoria líquida",
    badgeTone: "emerald",
    locations: [
      "lib/mnemosyne/",
      "lib/chat/hybrid-search.ts",
      "lib/mnemosyne/hooks.ts",
    ],
    functions: [
      "Indexar embeddings locales de diario, KG, Purifier, cuadernos y chat.",
      "Servir búsqueda vectorial + rerank para el Exocórtex.",
      "Re-hidratar contexto más allá del historial de 10 turnos.",
    ],
    technologies: [
      "Cohere embed-v4.0",
      "Cohere rerank-v3.5",
      "Prisma (MemoryEmbedding)",
    ],
  },
  {
    id: "centinela-somatico",
    emoji: "🫀",
    name: "Centinela Somático",
    badge: "Captura · Salud multimodal",
    badgeTone: "emerald",
    locations: [
      "components/salud/panels/alimentacion-panel.tsx",
      "lib/health/ingest-service.ts",
      "lib/health/vision-food.ts",
      "lib/health/transcribe-note.ts",
      "app/api/salud/ingest/route.ts",
    ],
    functions: [
      "Captar ingestas reales desde /salud (texto, foto y nota de voz).",
      "Enrutar a visión Cohere, Deepgram STT y Nutrimetron según modalidad.",
      "Coordinar el flujo entre Nutrimetron, Kinetómetro y agentes en incubación.",
    ],
    technologies: [
      "Prisma (HealthRecord, ContextEvent)",
      "lib/health/service.ts",
      "lib/events/service.ts",
    ],
    uiRoute: "/salud",
  },
  {
    id: "nutrimetron",
    emoji: "🥑",
    name: "Nutrimetron",
    badge: "HITL · Combustible",
    badgeTone: "rose",
    locations: [
      "components/salud/panels/alimentacion-panel.tsx",
      "components/salud/fasting-strip.tsx",
      "lib/health/nutrition-extract.ts",
      "lib/health/ingest-service.ts",
    ],
    functions: [
      "Desglosar ingestas en ítems, macros estimados y metadata de combustible.",
      "Analizar fotos de comida (visión) y transcripciones de voz (STT).",
      "Persistir comidas estructuradas en HealthRecord con ayuno intermitente.",
    ],
    technologies: [
      "Prisma (HealthRecord)",
      "lib/events/types.ts (combustibleMetricsSchema)",
    ],
    uiRoute: "/salud",
  },
  {
    id: "kinetometro",
    emoji: "🏃",
    name: "Kinetómetro",
    badge: "HITL · Rendimiento",
    badgeTone: "rose",
    locations: [
      "components/salud/panels/deporte-panel.tsx",
      "lib/health/service.ts",
    ],
    functions: [
      "Registrar actividad física con duración, distancia o intensidad.",
      "Mapear métricas unificadas al schema de rendimiento (durationMin, intensity).",
      "Alimentar historial de carga física para correlación con energía y foco.",
    ],
    technologies: [
      "Prisma (HealthRecord)",
      "lib/events/types.ts (rendimientoMetricsSchema)",
    ],
    uiRoute: "/salud",
  },
  {
    id: "cronista",
    emoji: "📜",
    name: "Cronista",
    badge: "Timeline · Calendario",
    badgeTone: "cyan",
    locations: [
      "lib/cronista/publish.ts",
      "lib/health/service.ts",
      "lib/events/service.ts",
      "app/api/calendario/route.ts",
    ],
    functions: [
      "Materializar ingestas de salud como eventos individuales del calendario.",
      "Emitir entradas en Historial con categoría salud.",
      "Backfill de eventos faltantes para registros legacy.",
      "Publicar eventos confirmados visibles en /calendario y Campamento mensual.",
      "Coordinar con Extractor de Eventos, Nutrimetron y Centinela Somático.",
    ],
    technologies: [
      "Prisma (ContextEvent, ActivityLog, HealthRecord)",
      "lib/cronista/publish.ts",
      "hooks/use-temporal-data.ts",
      "app/api/calendario/route.ts",
    ],
    uiRoute: "/calendario",
  },
  {
    id: "orquestador-temporal",
    emoji: "🕰️",
    name: "Orquestador Temporal",
    badge: "Determinístico · SSOT",
    badgeTone: "zinc",
    locations: [
      "lib/temporal/ranges.ts",
      "lib/temporal/queries.ts",
      "lib/temporal/mutations.ts",
      "hooks/use-temporal-data.ts",
      "app/api/temporal/range/route.ts",
      "app/api/calendario/route.ts",
      "components/babel/babel-context.tsx",
    ],
    functions: [
      "Unificar PendingTask y ContextEvent en bloques temporales por rango y universo.",
      "Servir la capa SSOT compartida entre Calendario, Campamento, Trinchera y Pendientes.",
      "Reprogramar tareas (PATCH reschedule) y eventos (PATCH occurredAt) con invalidación cruzada.",
      "Exponer rangos semanales y mensuales para el planificador de Campamento.",
      "Filtrar eventos por universo activo manteniendo telemetría de salud global.",
    ],
    technologies: [
      "Prisma (PendingTask, ContextEvent)",
      "lib/pendientes/store.ts",
      "lib/events/service.ts",
      "BabelProvider (temporalVersion, bumpTemporal)",
      "lib/babel/universe-refs.ts",
    ],
    uiRoute: "/calendario",
  },
  {
    id: "planificador-campamento",
    emoji: "⛺",
    name: "Planificador de Campamento",
    badge: "HITL · Semana / Mes",
    badgeTone: "emerald",
    locations: [
      "components/ludus/campamento/campamento-planner.tsx",
      "components/ludus/campamento/campamento-week-grid.tsx",
      "components/ludus/campamento/campamento-month-view.tsx",
      "components/ludus/campamento/quick-ideas-panel.tsx",
      "components/ludus/campamento/temporal-block-chip.tsx",
      "app/ludus/campamento/page.tsx",
    ],
    functions: [
      "Renderizar vista semanal de 7 días con bloques de tareas y eventos.",
      "Alternar a vista mensual de control con densidad de actividad.",
      "Permitir drag & drop de tareas y eventos entre días de la semana.",
      "Crear ideas rápidas en transición vía POST /api/pendientes.",
      "Sincronizar cambios al instante con /calendario vía Orquestador Temporal.",
    ],
    technologies: [
      "HTML5 Drag and Drop",
      "hooks/use-temporal-data.ts",
      "lib/temporal/ranges.ts",
      "UniverseSwitcher",
      "BabelProvider",
    ],
    uiRoute: "/ludus/campamento",
  },
  {
    id: "foco-trinchera",
    emoji: "🕳️",
    name: "Foco de Trinchera",
    badge: "HITL · Día absoluto",
    badgeTone: "rose",
    locations: [
      "components/ludus/trinchera/trinchera-day-focus.tsx",
      "components/ludus/trinchera/trinchera-focus-dock.tsx",
      "components/ludus/trinchera-workspace.tsx",
      "components/ludus/sound-lab/laboratorio-sonoro.tsx",
      "app/ludus/trinchera/page.tsx",
    ],
    functions: [
      "Navegar Ayer / Hoy / Mañana como núcleo del foco diario.",
      "Mostrar tareas obligatorias, sugeridas y asaltos del día por universo.",
      "Integrar Laboratorio Sonoro y panel de notas sin perder funcionalidades.",
      "Iniciar asaltos desde chips vinculados a PendingTask calibradas.",
      "Consumir el mismo día seleccionado que Calendario y BabelProvider.",
    ],
    technologies: [
      "BabelProvider (selectedDay)",
      "lib/pendientes/asaltos.ts",
      "lib/ludus/service.ts",
      "TrincheraSessionProvider",
      "Web Audio API (Laboratorio Sonoro)",
    ],
    uiRoute: "/ludus/trinchera",
  },
  {
    id: "grafologo-castillo",
    emoji: "🧭",
    name: "Grafólogo del Castillo",
    badge: "Determinístico · Grafo semántico",
    badgeTone: "amber",
    locations: [
      "lib/castillo/semantic-map.ts",
      "lib/castillo/semantic-map-types.ts",
      "app/api/castillo/semantic-map/route.ts",
      "components/castillo/castillo-semantic-map.tsx",
    ],
    functions: [
      "Construir el snapshot ego-céntrico (nodo YO + personas, proyectos, cuadernos).",
      "Mantener el nodo YO fijo como núcleo gravitacional del corpus.",
      "Buscador semántico con resaltado y atenuación de nodos.",
      "Filtros rápidos por tipo de entidad (Personas, Proyectos, Cuadernos).",
      "Deep links a /grafo, /proyectos e /ingesta/cuadernos desde nodos del mapa.",
    ],
    technologies: [
      "@xyflow/react",
      "Prisma (KgNode, KgEdge, Notebook)",
      "lib/projects/service.ts",
      "Babel (filtro de universo)",
    ],
    uiRoute: "/ludus/castillo",
  },
  {
    id: "cartografo-campamento",
    emoji: "🗺️",
    name: "Cartógrafo del Campamento",
    badge: "Determinístico · Terreno real",
    badgeTone: "emerald",
    locations: [
      "lib/geo/campamento-map.ts",
      "app/api/campamento/geo/route.ts",
      "components/ludus/campamento/campamento-geo-map.tsx",
      "components/ludus/campamento/campamento-geo-map-inner.tsx",
    ],
    functions: [
      "Renderizar marcadores permanentes (isPermanent) en React Leaflet con tiles oscuros.",
      "Pintar marcadores temporales desde GET /api/campamento/geo según rango Babel.",
      "Popup con detalle del bloque y acción HITL: completar tarea o confirmar evento.",
      "Sincronizar invalidación con bumpTemporal() tras acciones desde el mapa.",
      "Filtros Hoy | Esta semana alineados al planificador.",
    ],
    technologies: [
      "react-leaflet",
      "leaflet",
      "CartoDB Dark Matter",
      "lib/temporal/queries.ts",
      "hooks/use-temporal-data.ts",
    ],
    uiRoute: "/ludus/campamento",
  },
  {
    id: "georreferenciador",
    emoji: "📍",
    name: "Georreferenciador",
    badge: "Determinístico · Nominatim",
    badgeTone: "zinc",
    locations: [
      "lib/geo/geocode.ts",
      "lib/geo/types.ts",
      "lib/geo/service.ts",
      "app/api/geo/locations/route.ts",
      "app/api/geo/geocode/route.ts",
    ],
    functions: [
      "Geocodificar direcciones vía Nominatim con cache y User-Agent identificable.",
      "Seed de hitos permanentes (Varona HQ, Casa) desde variables de entorno.",
      "CRUD de ubicaciones en GeoLocation y endpoint POST /api/geo/geocode.",
      "Enriquecer structuredData.location de eventos al resolver coordenadas.",
      "Rechazar coordenadas inventadas si el geocode falla.",
    ],
    technologies: [
      "Nominatim (OpenStreetMap)",
      "Prisma (GeoLocation)",
      "Zod (geoPayloadSchema)",
    ],
    uiRoute: "/ludus/campamento",
  },
];

/** Agentes del eje temporal: calendario, eventos y planificación Ludus. */
export const TEMPORAL_ECOSYSTEM_AGENT_IDS = [
  "orquestador-temporal",
  "planificador-campamento",
  "foco-trinchera",
  "extractor-eventos",
  "cronista",
  "listador",
  "task-calibrator",
  "babel-universes",
  "extractor-trailing",
  "ludus",
] as const;

/** Agentes de cartografía dual: grafo semántico + mapa geográfico. */
export const CARTOGRAPHY_ECOSYSTEM_AGENT_IDS = [
  "grafologo-castillo",
  "cartografo-campamento",
  "georreferenciador",
  "ludus",
] as const;

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
    status: "design",
    plannedFunctions: [
      "Integrar APIs y sensores biológicos (sueño, HRV, pasos, wearables).",
      "Normalizar lecturas en fragmentos con las Siete Dimensiones (onda: personal-health).",
      "Correlacionar estado somático con priorización atencional y ventanas de Focus Work.",
    ],
    description:
      "Especialista en telemetría biológica para la pestaña Telemetría de /salud. El módulo manual de salud ya opera vía HealthRecord; la integración con wearables y APIs externas está pendiente.",
    plannedLocation:
      "components/salud/panels/telemetria-panel.tsx · futuro lib/somatometron/",
    plannedTechnologies: [
      "Periféricos locales",
      "APIs de sueño/HRV",
      "NFC/hábitos (field: nfc-habit-loop)",
    ],
  },
  {
    id: "ambientografo",
    emoji: "🌤️",
    name: "Ambientógrafo",
    subtitle: "Entorno y Bienestar Extendido",
    status: "design",
    plannedFunctions: [
      "Capturar exposición solar, calidad del aire y contexto ambiental.",
      "Registrar sesiones de meditación y métricas de bienestar no biométricas.",
      "Correlacionar entorno con estado base y recuperación.",
    ],
    description:
      "Especialista reservado para la pestaña Más de /salud. Espacio para métricas de entorno que complementen la telemetría somática.",
    plannedLocation:
      "components/salud/panels/mas-panel.tsx · futuro lib/ambientografo/",
    plannedTechnologies: [
      "APIs meteorológicas",
      "Sensores de calidad del aire",
      "Entrada manual HITL",
    ],
  },
];

export type MagoAgent = OperationalAgent & {
  category: "magos";
};

/** Categoría Magos — agentes herméticos indexados sobre la matriz de 22. */
export const MAGOS_AGENTS: MagoAgent[] = [
  {
    id: "mago-22",
    emoji: "✦",
    name: "El Mago 22",
    badge: "Matriz · 22 arcanos",
    badgeTone: "amber",
    status: "operational",
    category: "magos",
    locations: [
      "lib/mago/constants.ts",
      "lib/mago/tradition.ts",
      "lib/mago/projection.ts",
      "lib/mago/store.ts",
      "app/api/mago/route.ts",
      "app/ludus/mago/page.tsx",
      "components/mago/mago-workspace.tsx",
    ],
    functions: [
      "Exponer la matriz fija CORE_ARCANA_22 (letra hebrea ↔ tarot ↔ tipo madre/doble/simple).",
      "Unificar tradición hermética de los Magos 3, 7 y 12 en una sola proyección relacional.",
      "Proyectar colecciones indexadas 1–22 sobre proyectos, Libro Rojo y capítulos.",
      "Derivar fricción de proyectos vinculados vía fogLevel / días sin actividad.",
      "Ofrecer filtros cabalísticos (Total / 3 Madres / 7 Dobles / 12 Simples) en /ludus/mago.",
    ],
    technologies: [
      "Prisma (MagoColeccion, MagoColeccionItem)",
      "lib/mago/tradition.ts",
      "lib/projects/service",
      "lib/ludus/project-activity",
      "Ludus noir UI",
    ],
    uiRoute: "/ludus/mago",
  },
  {
    id: "mago-3",
    emoji: "☿",
    name: "El Mago 3",
    badge: "Madres · Mercurio, Azufre, Sal",
    badgeTone: "rose",
    status: "operational",
    category: "magos",
    locations: [
      "lib/mago/tradition.ts",
      "app/ludus/mago/3/page.tsx",
      "components/mago/mago-workspace.tsx",
    ],
    functions: [
      "Enfocar las 3 Letras Madres (Aleph, Mem, Shin): principios elementales y alquímicos.",
      "Exponer Mercurio/Azufre/Sal, género y atributos (volatilidad, combustibilidad, fijación).",
      "Compartir la misma matriz y colecciones indexadas 1–22 con el Mago 22.",
    ],
    technologies: [
      "lib/mago/tradition.ts (TRADICION_MADRES)",
      "lib/mago/projection.ts",
      "Ludus noir UI",
    ],
    uiRoute: "/ludus/mago/3",
  },
  {
    id: "mago-7",
    emoji: "☉",
    name: "El Mago 7",
    badge: "Dobles · V.I.T.R.I.O.L.",
    badgeTone: "amber",
    status: "operational",
    category: "magos",
    locations: [
      "lib/mago/tradition.ts",
      "app/ludus/mago/7/page.tsx",
      "components/mago/mago-workspace.tsx",
    ],
    functions: [
      "Enfocar las 7 Letras Dobles: Sephirot, hermetismo, chakras y V.I.T.R.I.O.L.",
      "Mapear cuerpo, emoción y desbalance por nivel doble (Bet, Gimel, Daleth, Kaph, Pe, Resh, Tav).",
      "Compartir proyección relacional con proyectos y dimensiones Deprocast.",
    ],
    technologies: [
      "lib/mago/tradition.ts (TRADICION_DOBLES)",
      "lib/mago/projection.ts",
      "Ludus noir UI",
    ],
    uiRoute: "/ludus/mago/7",
  },
  {
    id: "mago-12",
    emoji: "☽",
    name: "El Mago 12",
    badge: "Simples · Gran Obra",
    badgeTone: "violet",
    status: "operational",
    category: "magos",
    locations: [
      "lib/mago/tradition.ts",
      "app/ludus/mago/12/page.tsx",
      "components/mago/mago-workspace.tsx",
    ],
    functions: [
      "Enfocar las 12 Letras Simples: astrología, fisiología y procesos de la Gran Obra.",
      "Exponer bodas alquímicas (Nigredo, Albedo, Citrinitas, Rubedo) donde aplica.",
      "Relacionar signos zodiacales, partes del cuerpo y procesos químicos con la vida Deprocast.",
    ],
    technologies: [
      "lib/mago/tradition.ts (TRADICION_SIMPLES)",
      "lib/mago/projection.ts",
      "Ludus noir UI",
    ],
    uiRoute: "/ludus/mago/12",
  },
];

export const ECOSYSTEM_STATS = {
  operationalCount: OPERATIONAL_AGENTS.length,
  subprocessorsCount: SUBPROCESSORS.length,
  kgSourcesCount: KG_INGEST_SOURCES.length,
  designCount: DESIGN_AGENTS.length,
  magosCount: MAGOS_AGENTS.length,
  llmProvider: "command-r-plus-08-2024",
  docSource: "docs/agentes.md",
} as const;
