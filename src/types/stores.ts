import type { Uuid } from "@/types/db";

/** Tienda fisica tal y como la pinta la seccion Tiendas. */
export interface StoreRow {
  id: Uuid;
  brandId: Uuid;
  brandName: string;
  name: string | null;
  address: string;
  city: string;
  country: string | null;
  latitude: number;
  longitude: number;
  placeId: string | null;
  isActive: boolean;
  source: string;
  createdAt: string | null;
}
