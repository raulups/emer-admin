import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface CardProps {
  /** Resalta la tarjeta al pasar el raton (para tarjetas clicables). */
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({ interactive = false, className, children }: CardProps) {
  return (
    <div
      className={cn(
        "bg-paper animate-rise rounded-xl border shadow-xs",
        interactive &&
          "hover:border-line-strong transition-[box-shadow,border-color] duration-150 hover:shadow-md",
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
    <div className={cn("flex items-center justify-between gap-3 border-b px-4 py-3", className)}>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
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
    <div className={cn("flex items-center gap-2 border-t px-4 py-3", className)}>{children}</div>
  );
}

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  /** Linea secundaria bajo el valor. */
  detail?: ReactNode;
  tone?: "default" | "ok" | "error" | "progress";
  href?: string;
  className?: string;
}

const STAT_DOTS: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-ink/25",
  ok: "bg-ok",
  error: "bg-error",
  progress: "bg-progress",
};

const STAT_TONES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-ink",
  ok: "text-ok",
  error: "text-error",
  progress: "text-ink",
};

const STAT_DELAYS =
  "[&:nth-child(2)]:[animation-delay:50ms] [&:nth-child(3)]:[animation-delay:100ms] [&:nth-child(4)]:[animation-delay:150ms] [&:nth-child(n+5)]:[animation-delay:200ms]";

/** Contador grande. */
export function StatCard({ label, value, detail, tone = "default", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-paper animate-rise flex flex-col gap-1.5 rounded-xl border p-4 shadow-xs",
        STAT_DELAYS,
        className,
      )}
    >
      <span className="text-ink/55 flex items-center gap-2 text-xs font-medium">
        <span aria-hidden className={cn("size-1.5 rounded-full", STAT_DOTS[tone])} />
        {label}
      </span>
      <span
        className={cn(
          "text-2xl leading-none font-semibold tracking-tight tabular-nums sm:text-3xl",
          STAT_TONES[tone],
        )}
      >
        {value}
      </span>
      {detail ? <span className="text-ink/50 text-xs">{detail}</span> : null}
    </div>
  );
}
