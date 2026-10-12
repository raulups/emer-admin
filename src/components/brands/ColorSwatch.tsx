import { cn } from "@/lib/utils";

export interface ColorSwatchProps {
  /** Hex con almohadilla, de 6 u 8 digitos. Vacio o null = sin color. */
  color: string | null | undefined;
  /** Muestra el valor hex al lado de la muestra. */
  showValue?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const HEX = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Muestra de color de marca. Si el hex no es valido, lo marca como inválido. */
export function ColorSwatch({ color, showValue = true, size = "sm", className }: ColorSwatchProps) {
  const value = color?.trim() ?? "";
  const valid = HEX.test(value);
  const box = size === "sm" ? "size-4" : "size-6";

  if (value === "") {
    return showValue ? (
      <span className={cn("text-ink/40 text-xs", className)}>Sin color</span>
    ) : null;
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        aria-hidden
        className={cn("border-ink shrink-0 border-2", box, !valid && "bg-cream")}
        style={valid ? { backgroundColor: value } : undefined}
        title={value}
      />
      {showValue ? (
        <span className={cn("font-mono text-xs", valid ? "text-ink/70" : "text-error")}>
          {valid ? value.toUpperCase() : `${value} (inválido)`}
        </span>
      ) : null}
    </span>
  );
}
