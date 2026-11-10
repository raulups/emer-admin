import "server-only";

import type { QueryResult } from "@/lib/queries/brands";
import { getSupabase } from "@/lib/supabase";
import { isFollowUpDue, todayIsoDate } from "@/lib/validation/outreach";
import {
  OUTREACH_STATUSES,
  TABLES,
  type Brand,
  type BrandOutreach,
  type BrandOutreachMessage,
  type OutreachStatus,
  type Uuid,
} from "@/types/db";
import type { OutreachCounts, OutreachDetail, OutreachListItem } from "@/types/outreach";

const PAGE_SIZE = 1000;
const MIGRATION_FILE = "supabase/migrations/20261109_brand_outreach.sql";

const OUTREACH_COLUMNS =
  "id, brand_id, status, contact_name, instagram, email, notes, follow_up_at, decided_at, created_at, updated_at";

/** Orden del listado: lo que pide accion primero, lo cerrado al final. */
const STATUS_ORDER: Record<OutreachStatus, number> = {
  in_conversation: 0,
  contacted: 1,
  no_response: 2,
  pending: 3,
  approved: 4,
  rejected: 5,
};

export function toOutreachMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const code = "code" in error ? String((error as { code: unknown }).code) : "";
    // PGRST205: la tabla no esta en la cache de esquema; 42P01: no existe.
    if (code === "PGRST205" || code === "42P01") {
      return `Faltan las tablas de contacto. Ejecuta ${MIGRATION_FILE} en el SQL editor de Supabase y recarga.`;
    }
    if ("message" in error) return String((error as { message: unknown }).message);
  }
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Error desconocido al consultar Supabase";
}

type MessageSummary = Pick<BrandOutreachMessage, "brand_id" | "channel" | "direction" | "sent_at">;

/** Todos los mensajes (solo metadatos), paginados con un orden estable. */
async function fetchMessageSummaries(): Promise<MessageSummary[]> {
  const supabase = getSupabase();
  const rows: MessageSummary[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(TABLES.brandOutreachMessages)
      .select("brand_id, channel, direction, sent_at")
      .order("sent_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as MessageSummary[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function getOutreachOverview(): Promise<
  QueryResult<{ items: OutreachListItem[]; counts: OutreachCounts }>
> {
  try {
    const supabase = getSupabase();
    const [brandsRes, outreachRes, messages] = await Promise.all([
      supabase.from(TABLES.brands).select("id, name, url").order("name"),
      supabase.from(TABLES.brandOutreach).select(OUTREACH_COLUMNS),
      fetchMessageSummaries(),
    ]);

    if (brandsRes.error) return { ok: false, error: toOutreachMessage(brandsRes.error) };
    if (outreachRes.error) return { ok: false, error: toOutreachMessage(outreachRes.error) };

    const brands = (brandsRes.data ?? []) as Array<Pick<Brand, "id" | "name" | "url">>;
    const outreachByBrand = new Map<Uuid, BrandOutreach>();
    for (const row of (outreachRes.data ?? []) as BrandOutreach[]) {
      outreachByBrand.set(row.brand_id, row);
    }

    // Los mensajes llegan del mas reciente al mas antiguo: el primero de cada
    // marca es el ultimo mensaje.
    const messageStats = new Map<Uuid, { count: number; last: MessageSummary }>();
    for (const message of messages) {
      const stats = messageStats.get(message.brand_id);
      if (stats) stats.count += 1;
      else messageStats.set(message.brand_id, { count: 1, last: message });
    }

    const today = todayIsoDate();
    const counts = Object.fromEntries(OUTREACH_STATUSES.map((s) => [s, 0])) as OutreachCounts;
    counts.total = 0;
    counts.due = 0;

    const items: OutreachListItem[] = brands.map((brand) => {
      const outreach = outreachByBrand.get(brand.id) ?? null;
      const stats = messageStats.get(brand.id);
      const status = outreach?.status ?? "pending";
      const followUpDue = isFollowUpDue(outreach, today);

      counts[status] += 1;
      counts.total += 1;
      if (followUpDue) counts.due += 1;

      return {
        brand,
        outreach,
        status,
        messageCount: stats?.count ?? 0,
        lastMessage: stats
          ? {
              channel: stats.last.channel,
              direction: stats.last.direction,
              sent_at: stats.last.sent_at,
            }
          : null,
        followUpDue,
      };
    });

    items.sort(
      (a, b) =>
        Number(b.followUpDue) - Number(a.followUpDue) ||
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        a.brand.name.localeCompare(b.brand.name, "es"),
    );

    return { ok: true, data: { items, counts } };
  } catch (error) {
    return { ok: false, error: toOutreachMessage(error) };
  }
}

/** Ficha de contacto de una marca. `data: null` si la marca no existe. */
export async function getOutreachDetail(
  brandId: Uuid,
): Promise<QueryResult<OutreachDetail | null>> {
  try {
    const supabase = getSupabase();
    const [brandRes, outreachRes, messagesRes] = await Promise.all([
      supabase.from(TABLES.brands).select("id, name, url, logo").eq("id", brandId).maybeSingle(),
      supabase
        .from(TABLES.brandOutreach)
        .select(OUTREACH_COLUMNS)
        .eq("brand_id", brandId)
        .maybeSingle(),
      supabase
        .from(TABLES.brandOutreachMessages)
        .select("id, brand_id, channel, direction, body, sent_at, created_at")
        .eq("brand_id", brandId)
        .order("sent_at", { ascending: false })
        .order("id"),
    ]);

    if (brandRes.error) return { ok: false, error: toOutreachMessage(brandRes.error) };
    if (!brandRes.data) return { ok: true, data: null };
    if (outreachRes.error) return { ok: false, error: toOutreachMessage(outreachRes.error) };
    if (messagesRes.error) return { ok: false, error: toOutreachMessage(messagesRes.error) };

    return {
      ok: true,
      data: {
        brand: brandRes.data as OutreachDetail["brand"],
        outreach: (outreachRes.data as BrandOutreach | null) ?? null,
        messages: (messagesRes.data ?? []) as BrandOutreachMessage[],
      },
    };
  } catch (error) {
    return { ok: false, error: toOutreachMessage(error) };
  }
}
