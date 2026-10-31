"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setTenantId } from "@/lib/api";

type MeResponse = { user: { id: string }; tenants: { id: string }[] };

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    apiFetch<MeResponse>("/auth/me")
      .then((me) => {
        const tenant = me.tenants[0];
        if (!tenant) return router.replace("/login");
        setTenantId(tenant.id);
        router.replace("/chat");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <main className="text-muted-foreground flex min-h-svh items-center justify-center text-sm">
      Memuat…
    </main>
  );
}
