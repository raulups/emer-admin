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
        "bg-paper shadow-hard flex flex-col items-center justify-center gap-3 border-2 p-10 text-center",
        tone === "error" ? "border-error" : "border-ink",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "size-8 rotate-45 border-2",
          tone === "error" ? "border-error bg-error" : "border-ink bg-cream",
        )}
      />
      <h3 className={cn("text-base", tone === "error" && "text-error")}>{title}</h3>
      {description ? (
        <p className="text-ink/70 max-w-prose text-sm whitespace-pre-line">{description}</p>
      ) : null}
      {action ? <div className="mt-1 flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
