import type { Brand, BrandOutreach, BrandOutreachMessage, OutreachStatus } from "@/types/db";

/** Fila del listado `/outreach`: todas las marcas, con o sin contacto. */
export interface OutreachListItem {
  brand: Pick<Brand, "id" | "name" | "url">;
  /** `null` si todavia no se ha guardado nada de esta marca. */
  outreach: BrandOutreach | null;
  /** `pending` cuando no hay fila. */
  status: OutreachStatus;
  messageCount: number;
  lastMessage: Pick<BrandOutreachMessage, "channel" | "direction" | "sent_at"> | null;
  /** Tiene fecha de seguimiento de hoy o anterior y la peticion no esta cerrada. */
  followUpDue: boolean;
}

export type OutreachCounts = Record<OutreachStatus, number> & { total: number; due: number };

export interface OutreachFilters {
  status: OutreachStatus | null;
  q: string;
  /** Solo marcas con seguimiento vencido. */
  due: boolean;
}

export interface OutreachDetail {
  brand: Pick<Brand, "id" | "name" | "url" | "logo">;
  outreach: BrandOutreach | null;
  messages: BrandOutreachMessage[];
}
