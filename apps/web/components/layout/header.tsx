"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { apiFetch, clearTenantId } from "@/lib/api";
import { MobileNav } from "./mobile-nav";

export function Header({ storeName, userName }: { storeName: string; userName: string }) {
  const router = useRouter();

  async function logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      clearTenantId();
      router.replace("/login");
    }
  }

  return (
    <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
      <MobileNav />
      <div className="min-w-0">
        <p className="font-display truncate text-sm font-semibold">{storeName}</p>
        <p className="text-muted-foreground truncate text-xs">Masuk sebagai {userName}</p>
      </div>
      <Badge variant="outline" className="ml-auto hidden border-primary/60 bg-primary/15 text-foreground sm:inline-flex">
        Data toko aktif
      </Badge>
      <Button variant="ghost" size="sm" onClick={logout} aria-label="Keluar" className="hover:bg-destructive/10 hover:text-destructive">
        <LogOut className="size-4" aria-hidden />
        <span className="hidden sm:inline">Keluar</span>
      </Button>
    </header>
  );
}
