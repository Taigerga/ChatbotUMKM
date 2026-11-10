import type { ComponentType, ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-interactive grid justify-items-center gap-2 rounded-[10px] border border-dashed p-8 text-center">
      {Icon && (
        <span className="bg-primary/15 text-foreground grid size-10 place-items-center rounded-full">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <p className="font-display text-base font-semibold">{title}</p>
      {description && <p className="text-muted-foreground max-w-md text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
