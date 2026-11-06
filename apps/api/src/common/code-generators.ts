import { randomUUID } from "node:crypto";

function suffix(length: number) {
  return randomUUID().replace(/-/g, "").slice(0, length).toUpperCase();
}

export function autoSku() {
  return `PRD-${suffix(6)}`;
}

export function autoCustomerRef() {
  return `CUS-${suffix(6)}`;
}

export function autoInvoiceCode(date: Date) {
  const day = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `INV-${day}-${suffix(8)}`;
}
