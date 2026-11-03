"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getTenantId, setTenantId } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { PreferencesProvider } from "@/components/preferences-provider";
import "./dashboard.css";

type MeResponse = { user: { id: string; name: string }; tenants: { id: string; name: string }[] };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<MeResponse>("/auth/me")
      .then((data) => {
        setMe(data);
        const current = getTenantId();
        if (!current || !data.tenants.some((t) => t.id === current)) {
          const first = data.tenants[0];
          if (!first) return router.replace("/login");
          setTenantId(first.id);
        }
      })
      .catch(() => {
        setError("Sesi berakhir. Silakan masuk lagi.");
        router.replace("/login");
      });
  }, [router]);

  if (error) {
    return <main className="text-muted-foreground flex min-h-svh items-center justify-center text-sm">{error}</main>;
  }

  if (!me) {
    return <main className="text-muted-foreground flex min-h-svh items-center justify-center text-sm">Memuat…</main>;
  }

  const activeTenantId = getTenantId();
  const storeName = me.tenants.find((t) => t.id === activeTenantId)?.name ?? me.tenants[0]?.name ?? "Toko";

  return (
    <PreferencesProvider>
      <div className="flex min-h-svh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header storeName={storeName} userName={me.user.name} />
          <main className="min-h-0 flex-1 dash-enter">{children}</main>
        </div>
      </div>
    </PreferencesProvider>
  );
}
