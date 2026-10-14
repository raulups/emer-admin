import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Botones alineados a la derecha. */
  actions?: ReactNode;
}

/** Fecha corta de cabecera de periodico: `lun 12 oct 2026`. */
function editionDate(): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date())
    .replace(/,/g, "");
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="border-ink relative mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 pb-4">
      <div className="min-w-0">
        <p className="text-ink/50 animate-fade mb-2 flex items-center gap-2 text-[10px] font-bold tracking-[0.25em] uppercase">
          <span aria-hidden className="bg-ink inline-block size-2" />
          Emer Admin
          <span aria-hidden className="bg-ink/30 inline-block h-0.5 w-6" />
          <span suppressHydrationWarning>{editionDate()}</span>
        </p>
        <h1 className="title-xl animate-reveal">{title}</h1>
        {description ? (
          <p className="text-ink/70 animate-rise mt-1.5 max-w-prose text-sm [animation-delay:120ms]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="animate-rise flex flex-wrap items-center gap-2 [animation-delay:160ms]">
          {actions}
        </div>
      ) : null}

      <span
        aria-hidden
        className="bg-ink animate-grow-x absolute -bottom-[5px] left-0 h-2 w-24 origin-left"
      />
    </div>
  );
}
