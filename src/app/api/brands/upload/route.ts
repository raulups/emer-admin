import { NextResponse } from "next/server";
import sharp from "sharp";

import {
  ACCEPTED_IMAGE_TYPES,
  deleteByPublicUrl,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
  slugify,
  uploadBrandImage,
} from "@/lib/storage";

export const dynamic = "force-dynamic";
/** sharp es nativo: este handler no puede ir en el runtime edge. */
export const runtime = "nodejs";

/** Ancho maximo segun el uso. No se amplia nunca una imagen pequeña. */
const MAX_WIDTH = { image: 1920, logo: 800 } as const;
const WEBP_QUALITY = 82;

type Kind = keyof typeof MAX_WIDTH;

function isKind(value: unknown): value is Kind {
  return value === "image" || value === "logo";
}

/**
 * POST /api/brands/upload (multipart/form-data)
 *
 * Campos: `file`, `kind` ("image" | "logo"), `brandName`, `previousUrl?`.
 * Procesa con sharp, sube al bucket `brands` y devuelve `{ url }`.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "La petición no es un formulario válido." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  const kindRaw = form.get("kind");
  const brandName = String(form.get("brandName") ?? "").trim();
  const previousUrl = form.get("previousUrl");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "No se ha recibido ningún archivo." },
      { status: 400 },
    );
  }

  if (!isKind(kindRaw)) {
    return NextResponse.json(
      { ok: false, error: '`kind` debe ser "image" o "logo".' },
      { status: 400 },
    );
  }

  const kind: Kind = kindRaw;

  // Se vuelve a validar aquí: lo que diga el navegador no cuenta.
  const extension = ACCEPTED_IMAGE_TYPES[file.type];
  if (!extension) {
    return NextResponse.json(
      {
        ok: false,
        error: `Formato no admitido (${file.type || "desconocido"}). Usa PNG, JPG, WEBP, AVIF o SVG.`,
      },
      { status: 415 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y el máximo son ${MAX_UPLOAD_MB} MB.`,
      },
      { status: 413 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ ok: false, error: "El archivo está vacío." }, { status: 400 });
  }

  const original = Buffer.from(await file.arrayBuffer());

  let body: Buffer;
  let contentType: string;
  let finalExtension: string;

  if (file.type === "image/svg+xml") {
    // Los SVG se suben tal cual: son vectoriales y sharp los rasterizaria.
    body = original;
    contentType = "image/svg+xml";
    finalExtension = "svg";
  } else {
    try {
      body = await sharp(original)
        .rotate() // respeta la orientación EXIF de las fotos
        .resize({
          width: MAX_WIDTH[kind],
          withoutEnlargement: true,
          fit: "inside",
        })
        // `webp` mantiene el canal alfa, que es lo que necesitan los logos.
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      contentType = "image/webp";
      finalExtension = "webp";
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: `No se ha podido procesar la imagen: ${
            error instanceof Error ? error.message : "formato ilegible"
          }`,
        },
        { status: 422 },
      );
    }
  }

  // El timestamp evita que la CDN siga sirviendo la imagen anterior.
  const path = `${slugify(brandName)}_${kind}_${Date.now()}.${finalExtension}`;

  const uploaded = await uploadBrandImage(path, body, contentType);
  if (!uploaded.ok) {
    return NextResponse.json({ ok: false, error: uploaded.error }, { status: 502 });
  }

  // Solo después de subir la nueva se borra la vieja, y solo si era nuestra
  // (las de Cloudinary y demás no se tocan).
  if (typeof previousUrl === "string" && previousUrl !== "") {
    await deleteByPublicUrl(previousUrl);
  }

  return NextResponse.json({
    ok: true,
    url: uploaded.data.url,
    bytes: uploaded.data.bytes,
    originalBytes: file.size,
    contentType: uploaded.data.contentType,
  });
}
