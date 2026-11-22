"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSupabase } from "@/lib/supabase";
import { TABLES, type Uuid } from "@/types/db";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Error desconocido al guardar en Supabase";
}

const idsSchema = z.array(z.uuid("Identificador no válido")).min(1, "No hay emails seleccionados.");

/**
 * Marca como avisados (o deshace el aviso de) los emails de `ids`. Sirve para llevar la cuenta de
 * a quien se ha escrito ya cuando salga la app.
 */
export async function setWaitlistNotified(ids: Uuid[], notified: boolean): Promise<ActionResult> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Selección no válida." };
  }

  try {
    const { error } = await getSupabase()
      .from(TABLES.appWaitlist)
      .update({ notified_at: notified ? new Date().toISOString() : null })
      .in("id", parsed.data);
    if (error) return { ok: false, error: toMessage(error) };

    revalidatePath("/waitlist");
    const n = parsed.data.length;
    return {
      ok: true,
      message: notified
        ? `${n === 1 ? "Email marcado" : `${n} emails marcados`} como avisado${n === 1 ? "" : "s"}.`
        : `${n === 1 ? "Email vuelve" : `${n} emails vuelven`} a pendiente.`,
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Borra un email de la lista (p. ej. si pide que se le quite). */
export async function deleteWaitlistEntry(id: Uuid): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Email no válido." };

  try {
    const { error } = await getSupabase().from(TABLES.appWaitlist).delete().eq("id", id);
    if (error) return { ok: false, error: toMessage(error) };

    revalidatePath("/waitlist");
    return { ok: true, message: "Email borrado de la lista." };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}
