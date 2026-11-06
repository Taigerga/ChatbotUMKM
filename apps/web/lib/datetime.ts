// Backend stores occurredAt in UTC. <input type="datetime-local"> works in local time,
// so convert explicitly instead of slicing an ISO string (which would shift hours).
export function toDatetimeLocal(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString();
}

export function nowLocal(): string {
  return toDatetimeLocal(new Date());
}
