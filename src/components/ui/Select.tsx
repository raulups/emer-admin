import type { ReactNode, SelectHTMLAttributes } from "react";

import { Field, fieldClasses } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
  /** Opciones; si prefieres, pasa los `<option>` como children. */
  options?: SelectOption[];
  /** Texto de la opcion vacia inicial. */
  placeholder?: string;
}

export function Select({
  label,
  hint,
  error,
  className,
  wrapperClassName,
  options,
  placeholder,
  id,
  name,
  children,
  ...props
}: SelectProps) {
  const inputId = id ?? name;

  const select = (
    <select
      id={inputId}
      name={name}
      className={cn(
        fieldClasses,
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%238a8a93' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")] cursor-pointer appearance-none bg-[length:16px] bg-[position:right_0.6rem_center] bg-no-repeat pr-9",
        error && "border-error",
        className,
      )}
      aria-invalid={error ? true : undefined}
      {...props}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options?.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
      {children}
    </select>
  );

  if (!label && !hint && !error) return select;

  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={wrapperClassName}>
      {select}
    </Field>
  );
}
