import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Texto accesible; por defecto "Cargando". */
  label?: string;
}

const SIZES = {
  sm: "size-4 border-2",
  md: "size-6 border-2",
  lg: "size-10 border-4",
} as const;

export function Spinner({ size = "md", className, label = "Cargando" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "border-ink inline-block animate-spin border-t-transparent",
        SIZES[size],
        className,
      )}
    />
  );
}

/** Spinner centrado con texto, para estados de carga de una seccion. */
export function LoadingBlock({ text = "Cargando…" }: { text?: string }) {
  return (
    <div className="border-ink bg-paper shadow-hard flex flex-col items-center justify-center gap-3 border-2 p-10">
      <Spinner size="lg" />
      <p className="label-caps text-ink/70">{text}</p>
    </div>
  );
}
