import "server-only";

import { getEnv } from "@/lib/env";
import { getSupabase } from "@/lib/supabase";

/**
 * Subida de imagenes de marca a Supabase Storage.
 *
 * SIEMPRE en el servidor con la service key: el navegador nunca sube nada
 * directamente ni ve la clave.
 */

export const BRANDS_BUCKET = "brands";

/** Tipos aceptados y su extension en el bucket. */
export const ACCEPTED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_MB = 10;

/** `accept` para el `<input type="file">`. */
export const ACCEPT_ATTRIBUTE = Object.keys(ACCEPTED_IMAGE_TYPES).join(",");

/** Prefijo publico del bucket, para saber si una URL es nuestra. */
export function publicPrefix(): string {
  return `${getEnv().SUPABASE_URL}/storage/v1/object/public/${BRANDS_BUCKET}/`;
}

/**
 * Nombre de archivo a partir del nombre de la marca:
 * "Dame Après Paris" → "dame_apres_paris".
 */
export function slugify(value: string): string {
  const base = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return base === "" ? "marca" : base.slice(0, 60);
}

/** `true` si la URL apunta a un archivo de NUESTRO bucket. */
export function isOwnStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return url.startsWith(publicPrefix());
  } catch {
    return false;
  }
}

/** Ruta dentro del bucket de una URL propia. `null` si no es nuestra. */
export function pathFromPublicUrl(url: string | null | undefined): string | null {
  if (!isOwnStorageUrl(url)) return null;
  const path = url!.slice(publicPrefix().length).split("?")[0] ?? "";
  return path === "" ? null : decodeURIComponent(path);
}

let bucketChecked = false;

/**
 * Se asegura de que el bucket existe y es publico. Solo se comprueba una vez
 * por proceso: en condiciones normales el bucket ya esta creado.
 */
export async function ensureBrandsBucket(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (bucketChecked) return { ok: true };

  const supabase = getSupabase();
  const { data, error } = await supabase.storage.getBucket(BRANDS_BUCKET);

  if (data && !error) {
    bucketChecked = true;
    return { ok: true };
  }

  const created = await supabase.storage.createBucket(BRANDS_BUCKET, {
    public: true,
    fileSizeLimit: MAX_UPLOAD_BYTES,
  });

  if (created.error) {
    // Si otro proceso lo creó entre medias, damos por bueno el bucket.
    if (created.error.message.toLowerCase().includes("already exists")) {
      bucketChecked = true;
      return { ok: true };
    }
    return { ok: false, error: `No se ha podido crear el bucket: ${created.error.message}` };
  }

  bucketChecked = true;
  return { ok: true };
}

/** Borra un archivo del bucket a partir de su URL publica. Ignora las ajenas. */
export async function deleteByPublicUrl(url: string | null | undefined): Promise<void> {
  const path = pathFromPublicUrl(url);
  if (!path) return;

  try {
    await getSupabase().storage.from(BRANDS_BUCKET).remove([path]);
  } catch {
    // Que falle el borrado del archivo viejo no debe romper el guardado:
    // como mucho queda un huérfano en el bucket.
  }
}

export interface UploadResult {
  url: string;
  path: string;
  bytes: number;
  contentType: string;
}

/** Sube un buffer ya procesado y devuelve su URL publica. */
export async function uploadBrandImage(
  path: string,
  body: Buffer,
  contentType: string,
): Promise<{ ok: true; data: UploadResult } | { ok: false; error: string }> {
  const bucket = await ensureBrandsBucket();
  if (!bucket.ok) return bucket;

  const supabase = getSupabase();

  const { error } = await supabase.storage.from(BRANDS_BUCKET).upload(path, body, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) return { ok: false, error: `No se ha podido subir la imagen: ${error.message}` };

  const { data } = supabase.storage.from(BRANDS_BUCKET).getPublicUrl(path);

  return {
    ok: true,
    data: { url: data.publicUrl, path, bytes: body.byteLength, contentType },
  };
}
