"use server";

import { revalidatePath } from "next/cache";

import { getBrandById, getBrandsUrlIndex } from "@/lib/queries/brands";
import { deleteByPublicUrl } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";
import { urlKey } from "@/lib/url";
import {
  brandFormSchema,
  toFieldErrors,
  type BrandFieldErrors,
  type BrandFormInput,
} from "@/lib/validation/brand";
import type { AdminDeleteBrandResult, Brand, Uuid } from "@/types/db";

export type BrandActionResult =
  { ok: true; id: Uuid } | { ok: false; error: string; fieldErrors?: BrandFieldErrors };

export type DeleteBrandResult =
  { ok: true; deletedProducts: number } | { ok: false; error: string };

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Error desconocido al guardar en Supabase";
}

/** Refresca el listado, el detalle y los contadores de la home. */
function revalidateBrand(id?: Uuid) {
  revalidatePath("/");
  revalidatePath("/brands");
  if (id) revalidatePath(`/brands/${id}`);
}

/**
 * Comprueba que ninguna otra marca apunte a la misma tienda.
 * Compara por dominio sin `www.` y sin barra final.
 */
async function findDuplicateByUrl(
  url: string,
  excludeId?: Uuid,
): Promise<{ error?: string; duplicate?: Pick<Brand, "id" | "name" | "url"> }> {
  const index = await getBrandsUrlIndex();
  if (!index.ok) return { error: index.error };

  const key = urlKey(url);
  if (key === "") return {};

  const duplicate = index.data.find(
    (brand) => brand.id !== excludeId && brand.url !== null && urlKey(brand.url) === key,
  );

  return duplicate ? { duplicate } : {};
}

/** Crea una marca. Valida con el mismo esquema zod que usa el formulario. */
export async function createBrand(input: BrandFormInput): Promise<BrandActionResult> {
  const parsed = brandFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados en rojo.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const values = parsed.data;

  const { error: indexError, duplicate } = await findDuplicateByUrl(values.url);
  if (indexError) return { ok: false, error: indexError };
  if (duplicate) {
    return {
      ok: false,
      error: `Ya existe una marca con esa tienda: "${duplicate.name}".`,
      fieldErrors: { url: `Esta tienda ya está dada de alta como "${duplicate.name}".` },
    };
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("brands")
      .insert({
        name: values.name,
        url: values.url,
        img: values.img,
        logo: values.logo,
        color: values.color,
        founded_year: values.founded_year,
        style: values.style,
        tags: values.tags,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: toMessage(error) };

    const id = (data as { id: Uuid }).id;
    revalidateBrand(id);
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Actualiza una marca existente. */
export async function updateBrand(id: Uuid, input: BrandFormInput): Promise<BrandActionResult> {
  const parsed = brandFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados en rojo.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const values = parsed.data;

  const { error: indexError, duplicate } = await findDuplicateByUrl(values.url, id);
  if (indexError) return { ok: false, error: indexError };
  if (duplicate) {
    return {
      ok: false,
      error: `Otra marca ya usa esa tienda: "${duplicate.name}".`,
      fieldErrors: { url: `Esta tienda ya está dada de alta como "${duplicate.name}".` },
    };
  }

  try {
    const supabase = getSupabase();

    // Se guarda lo que había para poder limpiar el bucket después.
    const previous = await getBrandById(id);
    const previousImg = previous.ok ? (previous.data?.img ?? null) : null;
    const previousLogo = previous.ok ? (previous.data?.logo ?? null) : null;

    const { error } = await supabase
      .from("brands")
      .update({
        name: values.name,
        url: values.url,
        img: values.img,
        logo: values.logo,
        color: values.color,
        founded_year: values.founded_year,
        style: values.style,
        tags: values.tags,
      })
      .eq("id", id);

    if (error) return { ok: false, error: toMessage(error) };

    // Ya con la fila guardada: si una imagen nuestra ha dejado de usarse
    // (la han quitado o reemplazado), se borra del bucket.
    if (previousImg && previousImg !== values.img) await deleteByPublicUrl(previousImg);
    if (previousLogo && previousLogo !== values.logo) await deleteByPublicUrl(previousLogo);

    revalidateBrand(id);
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/**
 * Borra una marca con TODO su contenido (productos, tallas, historial, runs,
 * tiendas y mappings) llamando a la RPC `admin_delete_brand`.
 *
 * `confirmName` debe coincidir exactamente con el nombre de la marca: es la
 * misma comprobacion que hace el dialogo, repetida en el servidor.
 */
export async function deleteBrand(id: Uuid, confirmName: string): Promise<DeleteBrandResult> {
  try {
    const supabase = getSupabase();

    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id, name, img, logo")
      .eq("id", id)
      .maybeSingle();

    if (brandError) return { ok: false, error: toMessage(brandError) };
    if (!brand) return { ok: false, error: "La marca ya no existe." };

    const row = brand as Pick<Brand, "id" | "name" | "img" | "logo">;
    const name = row.name;
    if (confirmName.trim() !== name) {
      return { ok: false, error: "El nombre escrito no coincide con el de la marca." };
    }

    const { data, error } = await supabase.rpc("admin_delete_brand", { p_brand_id: id });
    if (error) return { ok: false, error: toMessage(error) };

    // La RPC devuelve `{ deleted_products }`, a veces envuelto en un array.
    const payload: unknown = Array.isArray(data) ? data[0] : data;
    const deletedProducts =
      payload && typeof payload === "object" && "deleted_products" in payload
        ? Number((payload as AdminDeleteBrandResult).deleted_products)
        : 0;

    // La marca ya no existe: sus imágenes del bucket sobran.
    await Promise.all([deleteByPublicUrl(row.img), deleteByPublicUrl(row.logo)]);

    revalidateBrand(id);
    return { ok: true, deletedProducts: Number.isFinite(deletedProducts) ? deletedProducts : 0 };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}
