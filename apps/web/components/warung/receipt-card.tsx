import type { ReactNode } from "react";

export function ReceiptCard({
  title,
  meta,
  children,
  footer,
  className = "",
}: {
  title?: string;
  meta?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`warung-receipt ${className}`}>
      {(title || meta) && (
        <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-border px-4 py-2">
          {title && <p className="warung-eyebrow">{title}</p>}
          {meta && <span className="text-muted-foreground text-xs">{meta}</span>}
        </div>
      )}
      <div className="px-4 py-3">{children}</div>
      {footer && <div className="border-t border-dashed border-border px-4 py-2">{footer}</div>}
    </div>
  );
}
