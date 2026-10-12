import type { ReactNode, TextareaHTMLAttributes } from "react";

import { Field, fieldClasses } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
}

export function Textarea({
  label,
  hint,
  error,
  className,
  wrapperClassName,
  id,
  name,
  rows = 4,
  ...props
}: TextareaProps) {
  const inputId = id ?? name;

  const textarea = (
    <textarea
      id={inputId}
      name={name}
      rows={rows}
      className={cn(fieldClasses, "resize-y", error && "border-error", className)}
      aria-invalid={error ? true : undefined}
      {...props}
    />
  );

  if (!label && !hint && !error) return textarea;

  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={wrapperClassName}>
      {textarea}
    </Field>
  );
}
