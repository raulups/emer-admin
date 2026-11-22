"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSupabase } from "@/lib/supabase";
import type { Uuid } from "@/types/db";

/** Resultado de una Server Action: mensaje para el toast o error. */
export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Error desconocido al guardar en Supabase";
}

function revalidateProduct(productId: Uuid) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/classification");
  revalidatePath(`/products/${productId}`);
}

const uuid = z.uuid("Identificador no válido");

/* ------------------------------------------------------------------ */
/* Categoria del producto                                              */
/* ------------------------------------------------------------------ */

/**
 * Fija la categoria a mano y bloquea el campo: con `category_locked = true`
 * el scraper ya no la sobrescribe.
 */
export async function setProductCategory(
  productId: Uuid,
  categoryId: Uuid | null,
): Promise<ActionResult> {
  const parsedId = uuid.safeParse(productId);
  if (!parsedId.success) return { ok: false, error: "Producto no válido." };

  if (categoryId !== null && !uuid.safeParse(categoryId).success) {
    return { ok: false, error: "Categoría no válida." };
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("products")
      .update({ category_id: categoryId, category_locked: true })
      .eq("id", productId);

    if (error) return { ok: false, error: toMessage(error) };

    revalidateProduct(productId);
    return { ok: true, message: "Categoría fijada; el scraper no la cambiará." };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

const BULK_CHUNK = 200;

/**
 * Fija la misma categoria a varios productos (y los bloquea), p. ej. todo un grupo de "Sin
 * categoria". Va por tandas para no pasar del largo de URL de PostgREST con el `in`.
 */
export async function setProductsCategory(
  productIds: Uuid[],
  categoryId: Uuid,
): Promise<ActionResult> {
  const parsed = z.array(uuid).min(1, "No hay productos.").max(5000).safeParse(productIds);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Productos no válidos." };
  if (!uuid.safeParse(categoryId).success) return { ok: false, error: "Categoría no válida." };

  try {
    const supabase = getSupabase();
    const ids = [...new Set(parsed.data)];
    for (let i = 0; i < ids.length; i += BULK_CHUNK) {
      const { error } = await supabase
        .from("products")
        .update({ category_id: categoryId, category_locked: true })
        .in("id", ids.slice(i, i + BULK_CHUNK));
      if (error) return { ok: false, error: toMessage(error) };
    }

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/classification");
    const n = ids.length;
    return {
      ok: true,
      message: `${n === 1 ? "1 producto clasificado" : `${n} productos clasificados`}; el scraper no los cambiará.`,
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Devuelve el control de la categoria a las reglas automaticas. */
export async function unlockProductCategory(productId: Uuid): Promise<ActionResult> {
  if (!uuid.safeParse(productId).success) return { ok: false, error: "Producto no válido." };

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("products")
      .update({ category_locked: false })
      .eq("id", productId);

    if (error) return { ok: false, error: toMessage(error) };

    revalidateProduct(productId);
    return { ok: true, message: "Desbloqueada: la decidirán las reglas en el próximo scrape." };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}
