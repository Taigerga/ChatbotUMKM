import type { ReactNode } from "react";

export function HumanNote({
  title = "Artinya buat toko Anda",
  children,
  tone = "amber",
}: {
  title?: string;
  children: ReactNode;
  tone?: "amber" | "green" | "red";
}) {
  const border = tone === "green" ? "border-chart-2" : tone === "red" ? "border-destructive" : "border-primary";
  return (
    <div className={`bg-muted rounded-r-[10px] border-l-4 px-3 py-2 ${border}`}>
      <p className="warung-eyebrow">{title}</p>
      <div className="mt-1 text-sm leading-relaxed">{children}</div>
    </div>
  );
}
