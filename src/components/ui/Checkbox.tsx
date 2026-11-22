import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  hint?: ReactNode;
  wrapperClassName?: string;
}

export function Checkbox({
  label,
  hint,
  className,
  wrapperClassName,
  id,
  name,
  ...props
}: CheckboxProps) {
  const inputId = id ?? name;

  return (
    <div className={cn("flex items-start gap-2", wrapperClassName)}>
      <input
        type="checkbox"
        id={inputId}
        name={name}
        className={cn(
          "border-line-strong bg-paper hover:border-ink/40 mt-0.5 size-4 shrink-0 cursor-pointer appearance-none rounded-[5px] border transition-colors duration-150",
          "checked:border-accent checked:bg-accent checked:bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 8.5 2.5 2.5L12 5.5'/%3E%3C/svg%3E\")] checked:bg-center checked:bg-no-repeat",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
      {label || hint ? (
        <div className="flex flex-col gap-0.5">
          {label ? (
            <label htmlFor={inputId} className="cursor-pointer text-sm leading-tight font-medium">
              {label}
            </label>
          ) : null}
          {hint ? <p className="text-ink/60 text-xs">{hint}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
