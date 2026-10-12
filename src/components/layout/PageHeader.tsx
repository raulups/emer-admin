import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Botones alineados a la derecha. */
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="border-ink mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 pb-4">
      <div className="min-w-0">
        <h1 className="title-xl">{title}</h1>
        {description ? (
          <p className="text-ink/70 mt-1.5 max-w-prose text-sm">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
