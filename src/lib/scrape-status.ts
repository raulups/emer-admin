import type { BadgeTone } from "@/components/ui/Badge";
import type { ScrapeStatus } from "@/types/db";

/** Etiqueta en español de cada estado de `scrape_runs`. */
export const SCRAPE_STATUS_LABELS: Record<ScrapeStatus, string> = {
  running: "En curso",
  success: "Correcto",
  partial: "Parcial",
  error: "Error",
};

/** Color de estado: amarillo en curso/parcial, verde correcto, rojo error. */
export const SCRAPE_STATUS_TONES: Record<ScrapeStatus, BadgeTone> = {
  running: "progress",
  success: "ok",
  partial: "progress",
  error: "error",
};
