import { NextResponse } from "next/server";

import { getReviewGroups } from "@/lib/queries/classification";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/classification/review?brand=<uuid>
 *
 * Agregado marca × product_type × categoría de una marca. Va por marca
 * porque PostgREST no agrupa y hacerlo con todo el catálogo son ~12 s.
 */
export async function GET(request: Request) {
  const brand = new URL(request.url).searchParams.get("brand");

  if (!brand || !UUID.test(brand)) {
    return NextResponse.json({ ok: false, error: "Falta el parámetro `brand`." }, { status: 400 });
  }

  const result = await getReviewGroups(brand);

  return result.ok
    ? NextResponse.json({ ok: true, ...result.data })
    : NextResponse.json({ ok: false, error: result.error }, { status: 500 });
}
