import "server-only";

import type { QueryResult } from "@/lib/queries/brands";
import { getSupabase } from "@/lib/supabase";
import { type AppWaitlistEntry, TABLES } from "@/types/db";

const PAGE_SIZE = 1000;
const MIGRATION = "migracion V6 del backend (app_waitlist)";

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Error desconocido al leer de Supabase";
}

/** Tabla que no existe en Postgres o en la cache de PostgREST. */
function isMissingTable(error: unknown): boolean {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  return code === "42P01" || code === "PGRST205";
}

export interface WaitlistOverview {
  entries: AppWaitlistEntry[];
  counts: { total: number; pending: number; notified: number; lastWeek: number };
}

/** Toda la lista, la mas reciente primero (paginada de 1000 en 1000 con orden estable). */
export async function getWaitlist(): Promise<QueryResult<WaitlistOverview>> {
  try {
    const supabase = getSupabase();
    const entries: AppWaitlistEntry[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from(TABLES.appWaitlist)
        .select("id, email, source, created_at, notified_at")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) {
        if (isMissingTable(error)) {
          return { ok: false, error: `No existe la tabla app_waitlist: aplica la ${MIGRATION}.` };
        }
        return { ok: false, error: toMessage(error) };
      }
      entries.push(...((data ?? []) as AppWaitlistEntry[]));
      if (!data || data.length < PAGE_SIZE) break;
    }

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const notified = entries.filter((entry) => entry.notified_at !== null).length;
    return {
      ok: true,
      data: {
        entries,
        counts: {
          total: entries.length,
          pending: entries.length - notified,
          notified,
          lastWeek: entries.filter((entry) => new Date(entry.created_at).getTime() >= weekAgo)
            .length,
        },
      },
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}
