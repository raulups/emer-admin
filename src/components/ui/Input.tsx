import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export const fieldClasses =
  "w-full border-2 border-ink bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50 transition-[box-shadow,translate] duration-[120ms] hover:shadow-hard-sm focus:shadow-hard-sm focus:-translate-x-px focus:-translate-y-px";

export interface FieldWrapperProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

/** Envoltorio comun de los campos: etiqueta en mayusculas, pista y error. */
export function Field({ label, hint, error, htmlFor, className, children }: FieldWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="label-caps">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-error text-xs font-bold">{error}</p>
      ) : hint ? (
        <p className="text-ink/60 text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
}

export function Input({
  label,
  hint,
  error,
  className,
  wrapperClassName,
  id,
  name,
  ...props
}: InputProps) {
  const inputId = id ?? name;

  const input = (
    <input
      id={inputId}
      name={name}
      className={cn(fieldClasses, error && "border-error", className)}
      aria-invalid={error ? true : undefined}
      {...props}
    />
  );

  if (!label && !hint && !error) return input;

  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={wrapperClassName}>
      {input}
    </Field>
  );
}
