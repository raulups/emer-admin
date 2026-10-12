import { BrandForm } from "@/components/brands/BrandForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { EMPTY_BRAND_FORM } from "@/lib/validation/brand";

export const metadata = { title: "Nueva marca · Emer Admin" };

export default function NewBrandPage() {
  return (
    <>
      <PageHeader
        title="Nueva marca"
        description="Da de alta una tienda Shopify para que el scraper empiece a traer sus productos."
      />
      <BrandForm mode="create" initial={EMPTY_BRAND_FORM} />
    </>
  );
}
