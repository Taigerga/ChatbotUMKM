"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { NAV } from "./nav-items";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="sm"
        aria-label={open ? "Tutup menu" : "Buka menu"}
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
      </Button>
      {open && (
        <div
          id="mobile-nav"
          className="bg-background fixed inset-x-0 top-[57px] bottom-0 z-40 border-t p-3"
          role="dialog"
          aria-label="Navigasi utama"
        >
          <nav className="grid gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              if (!item.ready) {
                return (
                  <span
                    key={item.href}
                    className="text-muted-foreground flex items-center gap-2 rounded-md px-2 py-2 text-sm opacity-60"
                  >
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
                  onClick={() => setOpen(false)}
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
        </div>
      )}
    </div>
  );
}
