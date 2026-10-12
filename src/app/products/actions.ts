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
