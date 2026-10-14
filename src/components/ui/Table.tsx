import type { HTMLAttributes, ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** Contenedor con borde y scroll horizontal. Envuelve siempre a `Table`. */
export function TableWrapper({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("border-ink bg-paper shadow-hard overflow-x-auto border-2", className)}>
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
  return <thead className={cn("bg-ink text-cream", className)}>{children}</thead>;
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
        "border-ink border-b-2 last:border-b-0",
        "transition-[background-color,box-shadow] duration-[120ms]",
        interactive &&
          "hover:bg-cream cursor-pointer hover:shadow-[inset_5px_0_0_var(--color-ink)]",
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
    <th
      className={cn(
        "px-3 py-2 text-[10px] font-bold tracking-widest whitespace-nowrap uppercase",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export interface TDProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
}

export function TD({ className, children, ...props }: TDProps) {
  return (
    <td className={cn("px-3 py-1.5 align-middle", className)} {...props}>
      {children}
    </td>
  );
}
