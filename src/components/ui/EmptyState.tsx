import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  /** Botones o enlaces de accion. */
  action?: ReactNode;
  /** `error` pinta el borde en rojo (para fallos de carga). */
  tone?: "default" | "error";
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  tone = "default",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "bg-paper animate-rise flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-center",
        tone === "error" && "border-error/40 bg-error-soft/40",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "mb-1 flex size-10 items-center justify-center rounded-full text-lg",
          tone === "error" ? "bg-error-soft text-error" : "bg-subtle text-ink/40",
        )}
      >
        {tone === "error" ? "!" : "∅"}
      </div>
      <h3 className={cn("text-sm font-semibold", tone === "error" && "text-error")}>{title}</h3>
      {description ? (
        <p className="text-ink/55 max-w-prose text-sm whitespace-pre-line">{description}</p>
      ) : null}
      {action ? <div className="mt-3 flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
