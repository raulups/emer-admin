import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "ok" | "error" | "progress" | "muted" | "accent";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-ink text-white",
  ok: "bg-ok-soft text-ok",
  error: "bg-error-soft text-error",
  progress: "bg-progress-soft text-[#8a5a00]",
  muted: "bg-subtle text-ink/70",
  accent: "bg-accent-soft text-accent",
};

const DOTS: Partial<Record<BadgeTone, string>> = {
  ok: "bg-ok",
  error: "bg-error",
  progress: "bg-progress",
};

export interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "muted", className, children }: BadgeProps) {
  const dot = DOTS[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {dot ? <span aria-hidden className={cn("size-1.5 rounded-full", dot)} /> : null}
      {children}
    </span>
  );
}
