import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandForm } from "@/components/brands/BrandForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getBrandById } from "@/lib/queries/brands";
import type { BrandFormInput } from "@/lib/validation/brand";
import type { Brand } from "@/types/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Editar marca · Emer Admin" };

/** Pasa de la fila de `brands` a los campos de texto del formulario. */
function toFormInput(brand: Brand): BrandFormInput {
  return {
    name: brand.name,
    url: brand.url ?? "",
    img: brand.img ?? "",
    logo: brand.logo ?? "",
    color: brand.color ?? "",
    founded_year: brand.founded_year === null ? "" : String(brand.founded_year),
    style: brand.style ?? "",
    tags: brand.tags,
  };
}

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getBrandById(id);

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Editar marca" />
        <EmptyState
          tone="error"
          title="No se ha podido cargar la marca"
          description={result.error}
          action={
            <Link href="/brands" className={buttonClasses("secondary", "md")}>
              Volver a marcas
            </Link>
          }
        />
      </>
    );
  }

  if (!result.data) notFound();

  const brand = result.data;

  return (
    <>
      <PageHeader
        title={`Editar: ${brand.name}`}
        description="Los cambios se aplican al instante en la app de Emer."
        actions={
          <Link href={`/brands/${brand.id}`} className={buttonClasses("secondary", "md")}>
            Ver detalle
          </Link>
        }
      />
      <BrandForm mode="edit" brandId={brand.id} initial={toFormInput(brand)} />
    </>
  );
}
