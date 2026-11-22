import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "accent";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white border-ink hover:bg-ink/85",
  secondary: "bg-paper text-ink border-line hover:bg-subtle hover:border-line-strong",
  danger: "bg-error text-white border-error hover:bg-error/90",
  ghost: "bg-transparent text-ink/70 border-transparent shadow-none hover:bg-subtle hover:text-ink",
  accent: "bg-accent text-white border-accent hover:bg-accent/90",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-7 gap-1.5 rounded-md px-2.5 text-xs",
  md: "h-9 gap-2 rounded-lg px-3.5 text-sm",
  lg: "h-11 gap-2 rounded-lg px-5 text-base",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra?: string,
): string {
  return cn(
    "press inline-flex shrink-0 cursor-pointer items-center justify-center border font-medium whitespace-nowrap select-none",
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
