import type { LucideIcon } from "lucide-react";
import {
  ArchiveIcon,
  BookOpenIcon,
  BrainCircuitIcon,
  CalendarIcon,
  CastleIcon,
  FlaskConicalIcon,
  Gamepad2Icon,
  GitBranchIcon,
  HeartPulseIcon,
  HistoryIcon,
  InboxIcon,
  ListTodoIcon,
  MessageSquareIcon,
  MicIcon,
  NetworkIcon,
  NotebookPenIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SwordsIcon,
  TentIcon,
  UserRoundIcon,
  VideoIcon,
  WandSparklesIcon,
  WrenchIcon,
  WalletIcon,
} from "lucide-react";

/** Categorías semánticas del Portal de navegación (⌘K / ESC). */
export type CommandCategory =
  | "nucleo"
  | "captura"
  | "cortex"
  | "ludus"
  | "sistema";

export type CommandRoute = {
  id: string;
  href: string;
  label: string;
  description?: string;
  hotkey: string;
  category: CommandCategory;
  icon: LucideIcon;
};

export const COMMAND_ROUTES: CommandRoute[] = [
  // ── NÚCLEO ──────────────────────────────────────────────
  {
    id: "yo",
    href: "/yo",
    label: "Yo",
    description: "Centro de mando del operador",
    hotkey: "C",
    category: "nucleo",
    icon: UserRoundIcon,
  },
  {
    id: "jornada",
    href: "/jornada",
    label: "Jornada",
    description: "Ritmo del día",
    hotkey: "J",
    category: "nucleo",
    icon: SparklesIcon,
  },
  {
    id: "diario",
    href: "/diario",
    label: "Diario",
    description: "Entradas diarias",
    hotkey: "D",
    category: "nucleo",
    icon: NotebookPenIcon,
  },
  {
    id: "chat",
    href: "/chat",
    label: "Chat",
    description: "Conversación con contexto",
    hotkey: "H",
    category: "nucleo",
    icon: MessageSquareIcon,
  },
  {
    id: "calendario",
    href: "/calendario",
    label: "Calendario",
    description: "Simulador de turnos / draft de misiones",
    hotkey: "Y",
    category: "nucleo",
    icon: CalendarIcon,
  },
  {
    id: "pendientes",
    href: "/pendientes",
    label: "Pendientes",
    description: "Tareas abiertas",
    hotkey: "U",
    category: "nucleo",
    icon: ListTodoIcon,
  },

  // ── CAPTURA ─────────────────────────────────────────────
  {
    id: "ingesta",
    href: "/ingesta",
    label: "Ingesta",
    description: "Captura multimodal",
    hotkey: "I",
    category: "captura",
    icon: InboxIcon,
  },
  {
    id: "audio",
    href: "/audio",
    label: "Audio",
    description: "Transcripciones y grabaciones",
    hotkey: "A",
    category: "captura",
    icon: MicIcon,
  },
  {
    id: "watcher",
    href: "/cam-recorder",
    label: "Watcher",
    description: "Grabación y observación",
    hotkey: "W",
    category: "captura",
    icon: VideoIcon,
  },

  // ── CÓRTEX & NODOS ──────────────────────────────────────
  {
    id: "cortex",
    href: "/cortex",
    label: "Córtex",
    description: "Snapshot de corpus y conocimiento",
    hotkey: "X",
    category: "cortex",
    icon: BrainCircuitIcon,
  },
  {
    id: "validar",
    href: "/validar",
    label: "Validar",
    description: "Revisión HITL del Purifier",
    hotkey: "V",
    category: "cortex",
    icon: ShieldCheckIcon,
  },
  {
    id: "proyectos",
    href: "/proyectos",
    label: "Proyectos",
    description: "Tablero por campos",
    hotkey: "P",
    category: "cortex",
    icon: GitBranchIcon,
  },
  {
    id: "personas",
    href: "/personas",
    label: "Personas",
    description: "CRM de contactos",
    hotkey: "N",
    category: "cortex",
    icon: UserRoundIcon,
  },
  {
    id: "grafo",
    href: "/grafo",
    label: "Grafo",
    description: "Knowledge graph visual",
    hotkey: "G",
    category: "cortex",
    icon: NetworkIcon,
  },
  {
    id: "molecular",
    href: "/molecular",
    label: "Molecular",
    description: "Vista molecular del corpus",
    hotkey: "M",
    category: "cortex",
    icon: FlaskConicalIcon,
  },
  {
    id: "archivo",
    href: "/archivo",
    label: "Archivo",
    description: "Explorador unificado",
    hotkey: "R",
    category: "cortex",
    icon: ArchiveIcon,
  },
  {
    id: "enciclopedia",
    href: "/enciclopedia",
    label: "Enciclopedia",
    description: "Exploración conceptual",
    hotkey: "E",
    category: "cortex",
    icon: BookOpenIcon,
  },

  // ── LUDUS ───────────────────────────────────────────────
  {
    id: "ludus",
    href: "/ludus",
    label: "Ludus",
    description: "Modo videojuego",
    hotkey: "L",
    category: "ludus",
    icon: Gamepad2Icon,
  },
  {
    id: "castillo",
    href: "/ludus/castillo",
    label: "Castillo",
    description: "Visión estratégica · Alpha",
    hotkey: "1",
    category: "ludus",
    icon: CastleIcon,
  },
  {
    id: "campamento",
    href: "/ludus/campamento",
    label: "Campamento",
    description: "Preparación meso · Beta",
    hotkey: "2",
    category: "ludus",
    icon: TentIcon,
  },
  {
    id: "trinchera",
    href: "/ludus/trinchera",
    label: "Trinchera",
    description: "Ejecución micro · Gamma",
    hotkey: "3",
    category: "ludus",
    icon: SwordsIcon,
  },
  {
    id: "mago",
    href: "/ludus/mago",
    label: "Mago 22",
    description: "Matriz hermética · letras y tarot",
    hotkey: "4",
    category: "ludus",
    icon: WandSparklesIcon,
  },

  // ── SISTEMA & TELEMETRÍA ────────────────────────────────
  {
    id: "salud",
    href: "/salud",
    label: "Salud",
    description: "Registros de bienestar",
    hotkey: "S",
    category: "sistema",
    icon: HeartPulseIcon,
  },
  {
    id: "finanzas",
    href: "/finanzas",
    label: "Finanzas",
    description: "Ledger financiero y eco-pulse",
    hotkey: "F",
    category: "sistema",
    icon: WalletIcon,
  },
  {
    id: "calibrador",
    href: "/calibrador",
    label: "Calibrador",
    description: "Calibración de vibe",
    hotkey: "B",
    category: "sistema",
    icon: WrenchIcon,
  },
  {
    id: "agentes",
    href: "/agentes",
    label: "Agentes",
    description: "Herramientas autónomas",
    hotkey: "T",
    category: "sistema",
    icon: SparklesIcon,
  },
  {
    id: "historial",
    href: "/historial",
    label: "Historial",
    description: "Log de actividad y agentes",
    hotkey: "O",
    category: "sistema",
    icon: HistoryIcon,
  },
  {
    id: "respaldo",
    href: "/respaldo",
    label: "Respaldo",
    description: "Import y export",
    hotkey: "K",
    category: "sistema",
    icon: ArchiveIcon,
  },
];

export const COMMAND_CATEGORY_LABELS: Record<CommandCategory, string> = {
  nucleo: "Núcleo",
  captura: "Captura",
  cortex: "Córtex & Nodos",
  ludus: "Ludus",
  sistema: "Sistema & Telemetría",
};

/** Orden de columnas en el Portal de navegación. */
export const COMMAND_CATEGORY_ORDER: CommandCategory[] = [
  "nucleo",
  "captura",
  "cortex",
  "ludus",
  "sistema",
];

const ROUTE_BY_ID = new Map(
  COMMAND_ROUTES.map((route) => [route.id, route] as const),
);

export function getRouteById(id: string): CommandRoute | undefined {
  return ROUTE_BY_ID.get(id);
}

/** Enlaces fijos a la izquierda de la topbar. */
export const TOP_NAV_PINNED_IDS = ["yo", "jornada", "chat"] as const;

export type TopNavMenuId =
  | "ingesta"
  | "nodos"
  | "cortex"
  | "ludus"
  | "sistema";

export type TopNavMenuItem = {
  routeId: string;
  /** Etiqueta opcional distinta del label de la ruta (ej. Texto → /ingesta). */
  label?: string;
};

export type TopNavMenu = {
  id: TopNavMenuId;
  label: string;
  items: TopNavMenuItem[];
};

/**
 * Menús desplegables de la topbar.
 * Escalable: añadir un ítem aquí basta para que aparezca en el dropdown.
 */
export const TOP_NAV_MENUS: TopNavMenu[] = [
  {
    id: "ingesta",
    label: "Ingesta",
    items: [
      { routeId: "ingesta", label: "Texto" },
      { routeId: "audio" },
      { routeId: "watcher" },
      { routeId: "diario" },
    ],
  },
  {
    id: "nodos",
    label: "Nodos",
    items: [
      { routeId: "personas" },
      { routeId: "proyectos" },
      { routeId: "calendario" },
      { routeId: "pendientes" },
    ],
  },
  {
    id: "cortex",
    label: "Córtex",
    items: [
      { routeId: "validar" },
      { routeId: "molecular" },
      { routeId: "archivo" },
      { routeId: "enciclopedia" },
      { routeId: "grafo" },
    ],
  },
  {
    id: "ludus",
    label: "Ludus",
    items: [
      { routeId: "castillo" },
      { routeId: "campamento" },
      { routeId: "trinchera" },
      { routeId: "mago" },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      { routeId: "salud" },
      { routeId: "finanzas" },
      { routeId: "calibrador" },
      { routeId: "agentes" },
      { routeId: "historial" },
      { routeId: "respaldo" },
    ],
  },
];

export const TOP_NAV_PINNED = TOP_NAV_PINNED_IDS.map((id) => {
  const route = getRouteById(id);
  if (!route) throw new Error(`Ruta pinned desconocida: ${id}`);
  return { href: route.href, label: route.label, id: route.id };
});

/** Resuelve ítems de un menú topbar a rutas concretas. */
export function resolveTopNavMenuItems(menu: TopNavMenu) {
  return menu.items.flatMap((item) => {
    const route = getRouteById(item.routeId);
    if (!route) return [];
    return [
      {
        href: route.href,
        label: item.label ?? route.label,
        icon: route.icon,
        id: route.id,
      },
    ];
  });
}

/** @deprecated Prefer TOP_NAV_PINNED + TOP_NAV_MENUS. */
export const NAV_LINKS = TOP_NAV_PINNED.map(({ href, label }) => ({
  href,
  label,
}));

const HOTKEY_MAP = new Map(
  COMMAND_ROUTES.map((route) => [route.hotkey.toLowerCase(), route]),
);

export function findRouteByHotkey(key: string): CommandRoute | undefined {
  return HOTKEY_MAP.get(key.toLowerCase());
}

export function filterRoutes(query: string): CommandRoute[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return COMMAND_ROUTES;

  return COMMAND_ROUTES.filter((route) => {
    const haystack = [route.label, route.description ?? "", route.href]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function groupRoutesByCategory(
  routes: CommandRoute[],
): Map<CommandCategory, CommandRoute[]> {
  const groups = new Map<CommandCategory, CommandRoute[]>();
  for (const category of COMMAND_CATEGORY_ORDER) {
    groups.set(category, []);
  }
  for (const route of routes) {
    const list = groups.get(route.category) ?? [];
    list.push(route);
    groups.set(route.category, list);
  }
  return groups;
}
