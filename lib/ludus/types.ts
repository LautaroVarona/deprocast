export type LudusAreaId = "castillo" | "campamento" | "trinchera";

export type LudusArea = {
  id: LudusAreaId;
  name: string;
  description: string;
  href: string;
  available: boolean;
  accent: string;
  lore: string;
};

export type LudusWorldStats = {
  catalogTotal: number;
  placedOnCanvas: number;
  signalPoints: number;
};
