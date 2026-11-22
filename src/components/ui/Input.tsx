import type { InputHTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";

export const fieldClasses =
  "h-9 w-full rounded-md border border-line bg-paper px-3 text-base text-ink shadow-xs sm:text-sm placeholder:text-ink/40 transition-[border-color,box-shadow] duration-150 hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-subtle disabled:opacity-60";

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
        <p className="text-error text-xs font-medium">{error}</p>
      ) : hint ? (
        <p className="text-ink/50 text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
  ref?: Ref<HTMLInputElement>;
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
