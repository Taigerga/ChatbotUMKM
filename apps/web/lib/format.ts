export function formatRupiah(value: string | number): string {
  const number = typeof value === "number" ? value : Number(value);
  return `Rp${Number.isFinite(number) ? number.toLocaleString("id-ID") : "0"}`;
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("id-ID", { dateStyle: "medium" });
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export function toDateInput(value: Date): string {
  return value.toISOString().slice(0, 10);
}
