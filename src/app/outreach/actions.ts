"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { toOutreachMessage } from "@/lib/queries/outreach";
import { UUID } from "@/lib/scrape-filters";
import { getSupabase } from "@/lib/supabase";
import {
  isFinalStatus,
  messageFormSchema,
  nextStatusAfterMessage,
  outreachFormSchema,
  toFieldErrors,
  type FieldErrors,
  type MessageFormInput,
  type OutreachFormInput,
} from "@/lib/validation/outreach";
import {
  OUTREACH_STATUSES,
  TABLES,
  type BrandOutreach,
  type OutreachStatus,
  type Uuid,
} from "@/types/db";

export type OutreachActionResult<T> =
  { ok: true } | { ok: false; error: string; fieldErrors?: FieldErrors<T> };

function revalidateOutreach(brandId: Uuid) {
  revalidatePath("/outreach");
  revalidatePath(`/outreach/${brandId}`);
}

function writeError(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && error.code === "23503") {
    return "La marca ya no existe.";
  }
  return toOutreachMessage(error);
}

async function getCurrent(
  brandId: Uuid,
): Promise<Pick<BrandOutreach, "status" | "decided_at"> | null> {
  const { data, error } = await getSupabase()
    .from(TABLES.brandOutreach)
    .select("status, decided_at")
    .eq("brand_id", brandId)
    .maybeSingle();
  if (error) throw error;
  return (data as Pick<BrandOutreach, "status" | "decided_at"> | null) ?? null;
}

/** `decided_at` se fija al cerrar la peticion y se limpia si se reabre. */
function decidedAtFor(
  next: OutreachStatus,
  current: Pick<BrandOutreach, "status" | "decided_at"> | null,
): string | null {
  if (!isFinalStatus(next)) return null;
  if (current && current.status === next && current.decided_at) return current.decided_at;
  return new Date().toISOString();
}

/** Guarda el estado y los datos de contacto de una marca (crea la fila si no existe). */
export async function saveOutreach(
  brandId: Uuid,
  input: OutreachFormInput,
): Promise<OutreachActionResult<OutreachFormInput>> {
  if (!UUID.test(brandId)) return { ok: false, error: "Marca no válida." };

  const parsed = outreachFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados en rojo.",
      fieldErrors: toFieldErrors<OutreachFormInput>(parsed.error),
    };
  }
  const values = parsed.data;

  try {
    const current = await getCurrent(brandId);
    const { error } = await getSupabase()
      .from(TABLES.brandOutreach)
      .upsert(
        {
          brand_id: brandId,
          ...values,
          decided_at: decidedAtFor(values.status, current),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "brand_id" },
      );
    if (error) return { ok: false, error: writeError(error) };

    revalidateOutreach(brandId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: writeError(error) };
  }
}

/**
 * Cambio rapido de estado desde el listado: solo toca `status` (y `decided_at`),
 * sin pisar los datos de contacto ni las notas.
 */
export async function setOutreachStatus(
  brandId: Uuid,
  status: OutreachStatus,
): Promise<OutreachActionResult<never>> {
  if (!UUID.test(brandId)) return { ok: false, error: "Marca no válida." };
  const parsed = z.enum(OUTREACH_STATUSES).safeParse(status);
  if (!parsed.success) return { ok: false, error: "Estado no válido." };

  try {
    const current = await getCurrent(brandId);
    if (current?.status === parsed.data) return { ok: true };

    const { error } = await getSupabase()
      .from(TABLES.brandOutreach)
      .upsert(
        {
          brand_id: brandId,
          status: parsed.data,
          decided_at: decidedAtFor(parsed.data, current),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "brand_id" },
      );
    if (error) return { ok: false, error: writeError(error) };

    revalidateOutreach(brandId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: writeError(error) };
  }
}

/**
 * Registra un mensaje enviado o recibido y, si procede, avanza el estado:
 * el primer envio pasa a "Contactada" y cualquier respuesta a "En conversacion".
 */
export async function addOutreachMessage(
  brandId: Uuid,
  input: MessageFormInput,
): Promise<OutreachActionResult<MessageFormInput> & { status?: OutreachStatus }> {
  if (!UUID.test(brandId)) return { ok: false, error: "Marca no válida." };

  const parsed = messageFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados en rojo.",
      fieldErrors: toFieldErrors<MessageFormInput>(parsed.error),
    };
  }
  const values = parsed.data;

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from(TABLES.brandOutreachMessages).insert({
      brand_id: brandId,
      channel: values.channel,
      direction: values.direction,
      body: values.body,
      sent_at: values.sent_at ? new Date(values.sent_at).toISOString() : new Date().toISOString(),
    });
    if (error) return { ok: false, error: writeError(error) };

    const current = await getCurrent(brandId);
    const currentStatus = current?.status ?? "pending";
    const nextStatus = nextStatusAfterMessage(currentStatus, values.direction);

    if (!current || nextStatus !== currentStatus) {
      const { error: statusError } = await supabase
        .from(TABLES.brandOutreach)
        .upsert(
          { brand_id: brandId, status: nextStatus, updated_at: new Date().toISOString() },
          { onConflict: "brand_id" },
        );
      if (statusError) {
        revalidateOutreach(brandId);
        return {
          ok: false,
          error: `Mensaje guardado, pero no se ha podido actualizar el estado: ${writeError(statusError)}`,
        };
      }
    }

    revalidateOutreach(brandId);
    return { ok: true, status: nextStatus };
  } catch (error) {
    return { ok: false, error: writeError(error) };
  }
}

export async function deleteOutreachMessage(
  brandId: Uuid,
  messageId: Uuid,
): Promise<OutreachActionResult<never>> {
  if (!UUID.test(brandId) || !UUID.test(messageId)) {
    return { ok: false, error: "Mensaje no válido." };
  }
  try {
    const { error } = await getSupabase()
      .from(TABLES.brandOutreachMessages)
      .delete()
      .eq("id", messageId)
      .eq("brand_id", brandId);
    if (error) return { ok: false, error: writeError(error) };

    revalidateOutreach(brandId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: writeError(error) };
  }
}
