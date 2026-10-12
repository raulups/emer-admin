"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSupabase } from "@/lib/supabase";
import type { Uuid } from "@/types/db";

/**
 * Acciones de clasificacion: reglas por palabra clave y mapeos por tienda.
 * Viven aqui (y no en productos) aunque el detalle de producto tambien las
 * use: esta es la seccion que manda sobre estas dos tablas.
 */

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Error desconocido al guardar en Supabase";
}

/** Violacion de restriccion unica en Postgres. */
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code: unknown }).code === UNIQUE_VIOLATION
  );
}

/** Las reglas y los mapeos cambian lo que vera el proximo scrape. */
function revalidateClassification(productId?: Uuid) {
  revalidatePath("/classification");
  revalidatePath("/products");
  if (productId) revalidatePath(`/products/${productId}`);
}

const uuid = z.uuid("Identificador no válido");

/* ------------------------------------------------------------------ */
/* Reglas por palabra clave                                            */
/* ------------------------------------------------------------------ */

/** Keyword: minusculas, sin espacios sobrantes, sin dobles espacios. */
const keywordField = z
  .string()
  .trim()
  .min(2, "La palabra clave debe tener al menos 2 caracteres")
  .max(80, "Máximo 80 caracteres")
  .transform((value) => value.toLowerCase().replace(/\s+/g, " "));

const priorityField = z
  .number()
  .int("La prioridad debe ser un número entero")
  .min(0, "La prioridad no puede ser negativa")
  .max(1000, "Máximo 1000");

export const keywordRuleSchema = z.object({
  keyword: keywordField,
  categoryId: uuid,
  priority: priorityField,
});

export type KeywordRuleInput = {
  keyword: string;
  categoryId: string;
  priority: number;
};

/** Crea una regla global de clasificacion por palabra clave. */
export async function createKeywordRule(
  input: KeywordRuleInput,
  productId?: Uuid,
): Promise<ActionResult> {
  const parsed = keywordRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }

  const { keyword, categoryId, priority } = parsed.data;

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("category_keyword_rules")
      .insert({ keyword, category_id: categoryId, priority });

    if (error) {
      if (isUniqueViolation(error)) {
        return { ok: false, error: `Ya existe una regla para la palabra "${keyword}".` };
      }
      return { ok: false, error: toMessage(error) };
    }

    revalidateClassification(productId);
    return {
      ok: true,
      message: `Regla creada para "${keyword}". Se aplicará en el próximo scrape.`,
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Edita la categoria y/o la prioridad de una regla (la keyword también). */
export async function updateKeywordRule(
  id: Uuid,
  input: Partial<KeywordRuleInput>,
): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Regla no válida." };

  const patch: Record<string, unknown> = {};

  if (input.keyword !== undefined) {
    const parsed = keywordField.safeParse(input.keyword);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Palabra clave no válida." };
    }
    patch.keyword = parsed.data;
  }

  if (input.categoryId !== undefined) {
    if (!uuid.safeParse(input.categoryId).success) {
      return { ok: false, error: "Categoría no válida." };
    }
    patch.category_id = input.categoryId;
  }

  if (input.priority !== undefined) {
    const parsed = priorityField.safeParse(input.priority);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Prioridad no válida." };
    }
    patch.priority = parsed.data;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "No hay nada que cambiar." };
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("category_keyword_rules").update(patch).eq("id", id);

    if (error) {
      if (isUniqueViolation(error)) {
        return { ok: false, error: "Ya existe otra regla con esa palabra clave." };
      }
      return { ok: false, error: toMessage(error) };
    }

    revalidateClassification();
    return { ok: true, message: "Regla actualizada. Se aplicará en el próximo scrape." };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function deleteKeywordRule(id: Uuid): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Regla no válida." };

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("category_keyword_rules").delete().eq("id", id);

    if (error) return { ok: false, error: toMessage(error) };

    revalidateClassification();
    return { ok: true, message: "Regla borrada." };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/* ------------------------------------------------------------------ */
/* Mapeos por tienda                                                   */
/* ------------------------------------------------------------------ */

export const shopMappingSchema = z.object({
  brandId: uuid,
  externalCategoryName: z
    .string()
    .trim()
    .min(1, "El product_type no puede estar vacío")
    .max(200, "Máximo 200 caracteres")
    .transform((value) => value.toLowerCase().replace(/\s+/g, " ")),
  categoryId: uuid,
});

export type ShopMappingInput = {
  brandId: string;
  externalCategoryName: string;
  categoryId: string;
};

/**
 * Mapea el `product_type` de una tienda a una categoria de Emer.
 * Si ya existe el par (marca, product_type), se actualiza la categoria.
 */
export async function upsertShopCategoryMapping(
  input: ShopMappingInput,
  productId?: Uuid,
): Promise<ActionResult> {
  const parsed = shopMappingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }

  const { brandId, externalCategoryName, categoryId } = parsed.data;

  try {
    const supabase = getSupabase();

    const existing = await supabase
      .from("shop_category_mappings")
      .select("id")
      .eq("brand_id", brandId)
      .eq("external_category_name", externalCategoryName)
      .maybeSingle();

    if (existing.error) return { ok: false, error: toMessage(existing.error) };

    if (existing.data) {
      const { error } = await supabase
        .from("shop_category_mappings")
        .update({ category_id: categoryId })
        .eq("id", (existing.data as { id: Uuid }).id);

      if (error) return { ok: false, error: toMessage(error) };

      revalidateClassification(productId);
      return {
        ok: true,
        message: `Mapeo actualizado para "${externalCategoryName}". Se aplicará en el próximo scrape.`,
      };
    }

    const { error } = await supabase.from("shop_category_mappings").insert({
      brand_id: brandId,
      external_category_name: externalCategoryName,
      category_id: categoryId,
    });

    if (error) {
      if (isUniqueViolation(error)) {
        return { ok: false, error: "Ya existe un mapeo para ese product_type en esta marca." };
      }
      return { ok: false, error: toMessage(error) };
    }

    revalidateClassification(productId);
    return {
      ok: true,
      message: `Mapeo creado para "${externalCategoryName}". Se aplicará en el próximo scrape.`,
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Cambia la categoria de un mapeo existente. */
export async function updateShopCategoryMapping(id: Uuid, categoryId: Uuid): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Mapeo no válido." };
  if (!uuid.safeParse(categoryId).success) return { ok: false, error: "Categoría no válida." };

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("shop_category_mappings")
      .update({ category_id: categoryId })
      .eq("id", id);

    if (error) return { ok: false, error: toMessage(error) };

    revalidateClassification();
    return { ok: true, message: "Mapeo actualizado. Se aplicará en el próximo scrape." };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function deleteShopCategoryMapping(id: Uuid): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Mapeo no válido." };

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("shop_category_mappings").delete().eq("id", id);

    if (error) return { ok: false, error: toMessage(error) };

    revalidateClassification();
    return { ok: true, message: "Mapeo borrado." };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}
