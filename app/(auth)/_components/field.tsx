import type { InputHTMLAttributes, ReactNode } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Element rendered inside the input on the trailing edge (e.g. a toggle). */
  trailing?: ReactNode;
};

export const fieldInputClass =
  "w-full rounded-input border border-border bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted/70 focus:border-tint focus:ring-2 focus:ring-tint/20";

export function Field({ label, id, trailing, className = "", ...props }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={`${fieldInputClass} ${trailing ? "pr-11" : ""} ${className}`}
          {...props}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">
            {trailing}
          </div>
        ) : null}
      </div>
    </div>
  );
}
