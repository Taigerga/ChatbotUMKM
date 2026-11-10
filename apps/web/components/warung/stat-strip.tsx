import { PriceTag } from "./price-tag";

export function StatStrip({
  items,
}: {
  items: { label: string; value: string | number; hint?: string }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <PriceTag key={item.label} label={item.label} value={item.value} hint={item.hint} />
      ))}
    </div>
  );
}
