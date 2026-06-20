import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  subtitle?: string;
  /** Slot rendered on the right side of the header (e.g. filters, actions). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Card({ title, subtitle, action, children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-card border border-border bg-card p-5 shadow-card ${className}`}
    >
      {title || action ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title ? (
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
            ) : null}
            {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
