import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="warung-eyebrow">{eyebrow}</p>}
        <h2 className="warung-title text-xl sm:text-2xl">{title}</h2>
        {description && <p className="text-muted-foreground mt-1 max-w-2xl text-xs sm:text-sm">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
