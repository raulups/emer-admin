import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface CardProps {
  /** Activa el desplazamiento al pasar el raton (para tarjetas clicables). */
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({ interactive = false, className, children }: CardProps) {
  return (
    <div
      className={cn(
        "border-ink bg-paper border-2",
        interactive ? "press" : "shadow-hard",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  /** Acciones alineadas a la derecha del titulo. */
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function CardHeader({ title, actions, className, children }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "border-ink flex items-center justify-between gap-3 border-b-2 px-4 py-2.5",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-sm tracking-wider">{title}</h2>
        {children}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("border-ink flex items-center gap-2 border-t-2 px-4 py-2.5", className)}>
      {children}
    </div>
  );
}

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  /** Linea secundaria bajo el valor. */
  detail?: ReactNode;
  /** Acento del valor: por defecto negro. */
  tone?: "default" | "ok" | "error" | "progress";
  href?: string;
  className?: string;
}

const STAT_TONES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-ink",
  ok: "text-ok",
  error: "text-error",
  progress: "text-ink",
};

/** Contador grande para la home. */
export function StatCard({ label, value, detail, tone = "default", className }: StatCardProps) {
  return (
    <div
      className={cn("border-ink bg-paper shadow-hard flex flex-col gap-1 border-2 p-4", className)}
    >
      <span className="label-caps text-ink/70">{label}</span>
      <span className={cn("text-4xl leading-none font-bold tracking-tighter", STAT_TONES[tone])}>
        {value}
      </span>
      {detail ? <span className="text-ink/60 mt-1 text-xs">{detail}</span> : null}
    </div>
  );
}
