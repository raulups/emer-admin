import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandForm } from "@/components/brands/BrandForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getBrandById } from "@/lib/queries/brands";
import { brandToFormInput } from "@/lib/validation/brand";

export const dynamic = "force-dynamic";

export const metadata = { title: "Editar marca · Emer Admin" };

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
      <BrandForm mode="edit" brandId={brand.id} initial={brandToFormInput(brand)} />
    </>
  );
}
