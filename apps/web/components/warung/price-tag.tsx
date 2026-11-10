export function PriceTag({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="border-l-4 border-primary pl-3">
      <p className="warung-eyebrow">{label}</p>
      <p className="warung-price mt-1 text-2xl leading-none font-semibold">{value}</p>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  );
}
