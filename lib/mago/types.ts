export type TipoLetraHebrea = "madre" | "doble" | "simple";

export type MagoFilter = "total" | "madre" | "doble" | "simple";

export type MagoRefKind = "project" | "pending_task" | "none";

export type MagoColeccionKind =
  | "generic"
  | "proyectos"
  | "libro_rojo"
  | "capitulos";

export interface ArcanaCore {
  id: number;
  letra: string;
  significado: string;
  tarot: string;
  tipo: TipoLetraHebrea;
}

/** 3 Madres — principios elementales y alquímicos. */
export type TradicionMadre = {
  alquimia: string;
  metal: string;
  genero: string;
  atributoAlquimico: string;
};

/** 7 Dobles — cosmología, chakras y V.I.T.R.I.O.L. */
export type TradicionDoble = {
  sephirot: string;
  hermetismo: string;
  chakra: string;
  mantra: string;
  elementoMetalPlaneta: string;
  cuerpoVitriol: string;
  emocion: string;
  desbalance: string;
};

/** 12 Simples — astrología, fisiología y Gran Obra. */
export type TradicionSimple = {
  astrologia: string;
  accionFisiologica: string;
  parteCuerpo: string;
  procesoQuimico: string;
  etapaAlquimica: string;
};

export type ArcanaTradicion =
  | { tipo: "madre"; madre: TradicionMadre }
  | { tipo: "doble"; doble: TradicionDoble }
  | { tipo: "simple"; simple: TradicionSimple };

export interface ColeccionUsuario22Item {
  index: number;
  referenciaId?: string;
  titulo: string;
  metadatos?: Record<string, unknown>;
}

export interface ColeccionUsuario22 {
  id: string;
  nombre: string;
  descripcion?: string;
  kind: MagoColeccionKind;
  items: ColeccionUsuario22Item[];
}

export interface PaginaMago22 {
  id: number;
  core: ArcanaCore;
  tradicion?: ArcanaTradicion;
  libroRojo?: {
    titulo: string;
    contenido?: string;
  };
  proyectoAsociado?: {
    id: string;
    nombre: string;
    estado?: string;
    friccion?: number;
    fogLevel?: "none" | "light" | "heavy";
  };
  capituloLibro?: {
    numero: string;
    titulo: string;
  };
  otrasDimensiones: {
    nombreColeccion: string;
    tituloElemento: string;
  }[];
}

export type MagoColeccionDto = {
  id: string;
  nombre: string;
  descripcion: string;
  kind: MagoColeccionKind;
  itemCount: number;
  filledCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MagoColeccionDetailDto = MagoColeccionDto & {
  items: {
    id: string;
    index: number;
    titulo: string;
    contenido: string;
    refKind: MagoRefKind;
    refId: string | null;
    metadata: Record<string, unknown>;
  }[];
};

export type MagoMatrixResponse = {
  pages: PaginaMago22[];
  colecciones: MagoColeccionDto[];
};
