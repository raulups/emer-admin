import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-cream hover:bg-ink",
  secondary: "bg-paper text-ink hover:bg-cream",
  danger: "bg-error text-paper",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra?: string,
): string {
  return cn(
    "press inline-flex cursor-pointer items-center justify-center gap-2 border-2 border-ink font-bold uppercase tracking-wide select-none",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Muestra un indicador de carga y deshabilita el boton. */
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled ?? loading}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {loading ? <Spinner size="xs" /> : null}
      {children}
    </button>
  );
}
