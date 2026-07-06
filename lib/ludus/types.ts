export type LudusAreaId = "castillo" | "campamento" | "trinchera";

export type LudusArea = {
  id: LudusAreaId;
  name: string;
  description: string;
  href: string;
  available: boolean;
  accent: string;
  lore: string;
  frequency: string;
  horizon: string;
};

export type LudusWorldStats = {
  catalogTotal: number;
  placedOnCanvas: number;
  signalPoints: number;
  unlockedStatues: string[];
};

export type LudusProjectStatus = "active" | "paused" | "inventory";

export type LudusCalibrationProject = {
  id: string;
  title: string;
  campo: string;
  estado: string;
  status: LudusProjectStatus;
  lastActivityAt: string | null;
  daysSinceActivity: number | null;
  fogLevel: "none" | "light" | "heavy";
  filePath: string;
};

export type LudusCalibrationSnapshot = {
  isSunday: boolean;
  projects: LudusCalibrationProject[];
  activeCount: number;
  foggedCount: number;
};

export type CampamentoEnergy = {
  energyPercent: number;
  avgSleepHours: number | null;
  wokeAt6Am: boolean;
  lowTelemetry: boolean;
  maxGoldenPrioritiesPerDay: number;
  goldenPrioritiesAssigned: number;
  canAssignMoreGolden: boolean;
  weekLabel: string;
};

export type LudusMicrotaskDto = {
  id: string;
  projectId: string;
  projectTitle: string;
  title: string;
  estimatedMin: number;
  baseWeight: number;
  status: string;
  forgedAt: string;
};

export type CampamentoSnapshot = {
  energy: CampamentoEnergy;
  microtasks: LudusMicrotaskDto[];
  projects: Array<{ id: string; title: string; campo: string }>;
};

export type ForgeCampamentoResponse = {
  microtask: LudusMicrotaskDto;
  energy: CampamentoEnergy;
  snapshot: CampamentoSnapshot;
};

export type AssaultBlockOption = {
  minutes: number;
  label: string;
};

export type LudusAssaultDto = {
  id: string;
  microtaskId: string | null;
  title: string;
  durationMin: number;
  startedAt: string;
  endsAt: string;
  completed: boolean;
  signalPoints: number;
};

export type TrincheraSnapshot = {
  signalPoints: number;
  assaultStreakToday: number;
  pendingMicrotasks: LudusMicrotaskDto[];
  blockOptions: AssaultBlockOption[];
  recentAssaults: LudusAssaultDto[];
};

export type CompleteAssaultResult = {
  assault: LudusAssaultDto;
  signalPointsEarned: number;
  totalSignalPoints: number;
  streakBonus: number;
};

export type LudusStatue = {
  id: string;
  name: string;
  cost: number;
  description: string;
};
