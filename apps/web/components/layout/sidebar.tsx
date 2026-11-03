"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { NAV } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar/80 p-3 backdrop-blur md:block">
      <div className="mb-5 flex items-center gap-2 px-2 py-1">
        <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm">
          U
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Chatbot UMKM</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Dashboard toko</p>
        </div>
      </div>
      <nav aria-label="Navigasi utama" className="grid gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          if (!item.ready) {
            return (
              <span key={item.href} className="text-muted-foreground flex items-center gap-2 rounded-xl px-3 py-2 text-sm opacity-50">
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
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 transition-transform group-hover:scale-110" aria-hidden />
              {item.label}
              {active && <span className="ml-auto size-1.5 rounded-full bg-primary-foreground/80" />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
