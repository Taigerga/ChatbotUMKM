import type { SaleItemDto } from "./dto/create-sale.dto.js";

export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function calculateTotals(items: SaleItemDto[], discount = 0, tax = 0) {
  const lineCents = items.map((item) => toCents(item.unitPrice) * item.qty);
  const subtotalCents = lineCents.reduce((sum, cents) => sum + cents, 0);
  const totalCents = subtotalCents - toCents(discount) + toCents(tax);
  return {
    subtotal: formatCents(subtotalCents),
    total: formatCents(totalCents),
    lineTotals: lineCents.map(formatCents),
  };
}
