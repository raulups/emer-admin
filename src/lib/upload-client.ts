/**
 * Subida de imagenes desde el formulario de marca.
 * El navegador solo manda el archivo: quien sube a Supabase es el servidor.
 */

export type UploadImageResult =
  { ok: true; url: string; bytes: number; originalBytes: number } | { ok: false; error: string };

export async function uploadBrandImage(params: {
  file: File;
  kind: "image" | "logo";
  brandName: string;
  /** URL anterior, para que el servidor borre el archivo viejo si era suyo. */
  previousUrl?: string | null;
}): Promise<UploadImageResult> {
  const form = new FormData();
  form.set("file", params.file);
  form.set("kind", params.kind);
  form.set("brandName", params.brandName);
  if (params.previousUrl) form.set("previousUrl", params.previousUrl);

  try {
    const response = await fetch("/api/brands/upload", { method: "POST", body: form });
    const payload: unknown = await response.json().catch(() => null);

    if (
      !response.ok ||
      !payload ||
      typeof payload !== "object" ||
      !("ok" in payload) ||
      !payload.ok
    ) {
      const error =
        payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error: unknown }).error)
          : `El servidor ha respondido ${response.status}.`;
      return { ok: false, error };
    }

    const data = payload as unknown as { url: string; bytes?: number; originalBytes?: number };
    return {
      ok: true,
      url: data.url,
      bytes: data.bytes ?? 0,
      originalBytes: data.originalBytes ?? params.file.size,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `No se ha podido subir: ${error.message}`
          : "No se ha podido subir.",
    };
  }
}
