const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";
const TENANT_KEY = "tenantId";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getTenantId(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(TENANT_KEY);
}

export function setTenantId(tenantId: string) {
  window.localStorage.setItem(TENANT_KEY, tenantId);
}

export function clearTenantId() {
  window.localStorage.removeItem(TENANT_KEY);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tenantId = getTenantId();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
      ...init.headers,
    },
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(response.status, body?.code ?? "ERROR", body?.message ?? "Permintaan gagal");
  }
  return body as T;
}
