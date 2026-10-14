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
        "border-ink bg-paper animate-rise border-2",
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
        "border-ink hatch flex items-center justify-between gap-3 border-b-2 px-4 py-2.5",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 truncate text-sm tracking-wider">
          <span aria-hidden className="bg-ink inline-block size-2 shrink-0" />
          {title}
        </h2>
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

const STAT_BARS: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-ink",
  ok: "bg-ok",
  error: "bg-error",
  progress: "bg-progress",
};

const STAT_DELAYS =
  "[&:nth-child(2)]:[animation-delay:70ms] [&:nth-child(3)]:[animation-delay:140ms] [&:nth-child(4)]:[animation-delay:210ms] [&:nth-child(n+5)]:[animation-delay:260ms]";

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
      className={cn(
        "border-ink bg-paper shadow-hard animate-rise group relative flex flex-col gap-1 overflow-hidden border-2 p-4 pt-5",
        "hover:shadow-hard-lg transition-[box-shadow,translate] duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5",
        STAT_DELAYS,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "animate-grow-x absolute inset-x-0 top-0 h-1.5 origin-left [animation-delay:inherit]",
          STAT_BARS[tone],
        )}
      />
      <span className="label-caps text-ink/70">{label}</span>
      <span className={cn("text-4xl leading-none font-bold tracking-tighter", STAT_TONES[tone])}>
        {value}
      </span>
      {detail ? <span className="text-ink/60 mt-1 text-xs">{detail}</span> : null}
    </div>
  );
}
