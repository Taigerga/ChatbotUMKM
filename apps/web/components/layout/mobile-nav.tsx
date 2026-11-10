"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
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
        aria-label="Buka menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-4" aria-hidden />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="font-display">Menu toko</SheetTitle>
          </SheetHeader>
          <nav className="grid gap-1 p-3" aria-label="Navigasi utama">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              if (!item.ready) {
                return (
                  <span
                    key={item.href}
                    className="text-muted-foreground flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm opacity-60"
                  >
                    <Icon className="size-4" aria-hidden />
                    {item.label}
                  </span>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm",
                    active ? "bg-primary font-medium text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
