import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "ok" | "error" | "progress" | "muted";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-ink text-cream border-ink",
  ok: "bg-ok text-paper border-ink",
  error: "bg-error text-paper border-ink",
  progress: "bg-progress text-ink border-ink",
  muted: "bg-paper text-ink border-ink",
};

export interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "muted", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center border-2 px-1.5 py-0.5 text-[10px] font-bold tracking-widest uppercase",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
