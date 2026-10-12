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
          "border-ink bg-paper mt-0.5 size-4 shrink-0 cursor-pointer appearance-none border-2",
          "checked:bg-ink checked:shadow-[inset_0_0_0_2px_var(--color-paper)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
      {label || hint ? (
        <div className="flex flex-col gap-0.5">
          {label ? (
            <label htmlFor={inputId} className="cursor-pointer text-sm leading-tight font-bold">
              {label}
            </label>
          ) : null}
          {hint ? <p className="text-ink/60 text-xs">{hint}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
