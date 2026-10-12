import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export interface PlaceholderProps {
  title: string;
  description: string;
  /** Lo que se construirá en esta sección. */
  pending: string;
}

/** Pagina de seccion aun sin implementar. Se ira sustituyendo seccion a seccion. */
export function Placeholder({ title, description, pending }: PlaceholderProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState title="Sección en construcción" description={pending} />
    </>
  );
}
