import type { HTMLAttributes, ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** Contenedor con borde y scroll horizontal. Envuelve siempre a `Table`. */
export function TableWrapper({ className, children }: { className?: string; children: ReactNode }) {
  return (
    // `relative`: si no, los `sr-only` (position: absolute) de las cabeceras escapan del
    // scroll y ensanchan toda la pagina en movil.
    <div className={cn("bg-paper relative overflow-x-auto rounded-xl border shadow-xs", className)}>
      {children}
    </div>
  );
}

export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <table className={cn("w-full border-collapse text-left text-sm", className)}>{children}</table>
  );
}

export function THead({ className, children }: { className?: string; children: ReactNode }) {
  return <thead className={cn("bg-subtle/60 text-ink/55 border-b", className)}>{children}</thead>;
}

export function TBody({ className, children }: { className?: string; children: ReactNode }) {
  return <tbody className={cn("rows-in", className)}>{children}</tbody>;
}

export interface TRProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Resalta la fila al pasar el raton (filas clicables). */
  interactive?: boolean;
  children: ReactNode;
}

export function TR({ interactive = false, className, children, ...props }: TRProps) {
  return (
    <tr
      className={cn(
        "border-b last:border-b-0",
        "transition-colors duration-150",
        interactive && "hover:bg-subtle/70 cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export interface THProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
}

export function TH({ className, children, ...props }: THProps) {
  return (
    <th className={cn("px-3 py-2.5 text-xs font-medium whitespace-nowrap", className)} {...props}>
      {children}
    </th>
  );
}

export interface TDProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
}

export function TD({ className, children, ...props }: TDProps) {
  return (
    <td className={cn("px-3 py-2.5 align-middle", className)} {...props}>
      {children}
    </td>
  );
}
