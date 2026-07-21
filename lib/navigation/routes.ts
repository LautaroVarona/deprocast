import type { LucideIcon } from "lucide-react";
import {
  ArchiveIcon,
  BookOpenIcon,
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

export type CommandCategory = "nav" | "ludus" | "extra";

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
  {
    id: "yo",
    href: "/yo",
    label: "Yo",
    description: "Centro de mando del operador",
    hotkey: "C",
    category: "nav",
    icon: UserRoundIcon,
  },
  {
    id: "ingesta",
    href: "/ingesta",
    label: "Ingesta",
    description: "Captura multimodal",
    hotkey: "I",
    category: "nav",
    icon: InboxIcon,
  },
  {
    id: "audio",
    href: "/audio",
    label: "Audio",
    description: "Transcripciones y grabaciones",
    hotkey: "A",
    category: "nav",
    icon: MicIcon,
  },
  {
    id: "diario",
    href: "/diario",
    label: "Diario",
    description: "Entradas diarias",
    hotkey: "D",
    category: "nav",
    icon: NotebookPenIcon,
  },
  {
    id: "jornada",
    href: "/jornada",
    label: "Jornada",
    description: "Ritmo del día",
    hotkey: "J",
    category: "nav",
    icon: SparklesIcon,
  },
  {
    id: "salud",
    href: "/salud",
    label: "Salud",
    description: "Registros de bienestar",
    hotkey: "S",
    category: "nav",
    icon: HeartPulseIcon,
  },
  {
    id: "finanzas",
    href: "/finanzas",
    label: "Finanzas",
    description: "Ledger financiero y eco-pulse",
    hotkey: "F",
    category: "nav",
    icon: WalletIcon,
  },
  {
    id: "chat",
    href: "/chat",
    label: "Chat",
    description: "Conversación con contexto",
    hotkey: "H",
    category: "nav",
    icon: MessageSquareIcon,
  },
  {
    id: "validar",
    href: "/validar",
    label: "Validar",
    description: "Revisión HITL del Purifier",
    hotkey: "V",
    category: "nav",
    icon: ShieldCheckIcon,
  },
  {
    id: "molecular",
    href: "/molecular",
    label: "Molecular",
    description: "Vista molecular del corpus",
    hotkey: "M",
    category: "nav",
    icon: FlaskConicalIcon,
  },
  {
    id: "archivo",
    href: "/archivo",
    label: "Archivo",
    description: "Explorador unificado",
    hotkey: "R",
    category: "nav",
    icon: ArchiveIcon,
  },
  {
    id: "enciclopedia",
    href: "/enciclopedia",
    label: "Enciclopedia",
    description: "Exploración conceptual",
    hotkey: "E",
    category: "nav",
    icon: BookOpenIcon,
  },
  {
    id: "watcher",
    href: "/cam-recorder",
    label: "Watcher",
    description: "Grabación y observación",
    hotkey: "W",
    category: "nav",
    icon: VideoIcon,
  },
  {
    id: "calibrador",
    href: "/calibrador",
    label: "Calibrador",
    description: "Calibración de vibe",
    hotkey: "B",
    category: "nav",
    icon: WrenchIcon,
  },
  {
    id: "proyectos",
    href: "/proyectos",
    label: "Proyectos",
    description: "Tablero por campos",
    hotkey: "P",
    category: "nav",
    icon: GitBranchIcon,
  },
  {
    id: "personas",
    href: "/personas",
    label: "Personas",
    description: "CRM de contactos",
    hotkey: "N",
    category: "nav",
    icon: UserRoundIcon,
  },
  {
    id: "grafo",
    href: "/grafo",
    label: "Grafo",
    description: "Knowledge graph visual",
    hotkey: "G",
    category: "nav",
    icon: NetworkIcon,
  },
  {
    id: "agentes",
    href: "/agentes",
    label: "Agentes",
    description: "Herramientas autónomas",
    hotkey: "T",
    category: "nav",
    icon: SparklesIcon,
  },
  {
    id: "historial",
    href: "/historial",
    label: "Historial",
    description: "Log de actividad y agentes",
    hotkey: "O",
    category: "nav",
    icon: HistoryIcon,
  },
  {
    id: "respaldo",
    href: "/respaldo",
    label: "Respaldo",
    description: "Import y export",
    hotkey: "K",
    category: "nav",
    icon: ArchiveIcon,
  },
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
  {
    id: "calendario",
    href: "/calendario",
    label: "Calendario",
    description: "Simulador de turnos / draft de misiones",
    hotkey: "Y",
    category: "extra",
    icon: CalendarIcon,
  },
  {
    id: "pendientes",
    href: "/pendientes",
    label: "Pendientes",
    description: "Tareas abiertas",
    hotkey: "U",
    category: "extra",
    icon: ListTodoIcon,
  },
];

/** Links del header horizontal (subset de COMMAND_ROUTES). */
export const NAV_LINKS = COMMAND_ROUTES.filter((route) => route.category === "nav").map(
  ({ href, label }) => ({ href, label }),
);

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

export const COMMAND_CATEGORY_LABELS: Record<CommandCategory, string> = {
  nav: "Navegación",
  ludus: "Ludus",
  extra: "Accesos extra",
};
