"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bot, Boxes, FileUp, LayoutDashboard, Settings, Users, Receipt } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

const NAV = [
  { href: "/chat", label: "Chatbot", icon: Bot, ready: true },
  { href: "/overview", label: "Ringkasan", icon: LayoutDashboard, ready: false },
  { href: "/transactions", label: "Transaksi", icon: Receipt, ready: false },
  { href: "/products", label: "Produk", icon: Boxes, ready: false },
  { href: "/customers", label: "Pelanggan", icon: Users, ready: false },
  { href: "/imports", label: "Impor Data", icon: FileUp, ready: false },
  { href: "/machine-learning", label: "Machine Learning", icon: BarChart3, ready: false },
  { href: "/settings", label: "Pengaturan", icon: Settings, ready: false },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-background hidden w-60 shrink-0 border-r p-3 md:block">
      <div className="mb-4 px-2 py-1 font-semibold">Chatbot UMKM</div>
      <nav aria-label="Navigasi utama" className="grid gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          if (!item.ready) {
            return (
              <span key={item.href} className="text-muted-foreground flex items-center gap-2 rounded-md px-2 py-2 text-sm opacity-60">
                <Icon className="size-4" aria-hidden />
                {item.label}
                <span className="ml-auto text-[10px] tracking-wide uppercase">soon</span>
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-2 text-sm",
                pathname === item.href ? "bg-muted font-medium" : "hover:bg-muted/60",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
