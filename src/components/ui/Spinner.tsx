import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  /** Texto accesible; por defecto "Cargando". */
  label?: string;
}

/** Lado de cada cuadrado y separacion entre ellos. */
const SIZES = {
  xs: { box: "size-1", gap: "gap-0.5" },
  sm: { box: "size-1.5", gap: "gap-1" },
  md: { box: "size-2", gap: "gap-1" },
  lg: { box: "size-3.5", gap: "gap-1.5" },
} as const;

const DELAYS = ["0ms", "150ms", "300ms"];

/**
 * Loader de tres cuadrados que laten en secuencia. Usa `currentColor`, asi que
 * toma el color del texto donde se pinte (negro por defecto, blanco en botones).
 */
export function Spinner({ size = "md", className, label = "Cargando" }: SpinnerProps) {
  const { box, gap } = SIZES[size];

  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex shrink-0 items-center align-middle", gap, className)}
    >
      {DELAYS.map((delay) => (
        <span
          key={delay}
          aria-hidden
          className={cn(
            "animate-loader-block inline-block rounded-full bg-current motion-reduce:animate-none",
            box,
          )}
          style={{ animationDelay: delay }}
        />
      ))}
    </span>
  );
}

/** Loader centrado con texto, para estados de carga de una seccion. */
export function LoadingBlock({ text = "Cargando…" }: { text?: string }) {
  return (
    <div className="bg-paper text-ink/40 flex flex-col items-center justify-center gap-3 rounded-xl border p-10">
      <Spinner size="lg" />
      <p className="text-ink/55 text-sm">{text}</p>
    </div>
  );
}
