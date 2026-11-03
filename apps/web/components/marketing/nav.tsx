"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@workspace/ui/lib/utils";

const LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/fitur", label: "Fitur" },
  { href: "/cara-kerja", label: "Cara Kerja" },
  { href: "/harga", label: "Harga" },
];

export function MarketingNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:pt-6">
      <nav
        className={cn(
          "pointer-events-auto flex w-full max-w-4xl items-center gap-2 rounded-full border px-3 py-2 transition-all duration-300",
          scrolled
            ? "border-mk-line bg-mk-surface/85 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.7)] backdrop-blur-xl"
            : "border-transparent bg-mk-surface/40 backdrop-blur-md",
        )}
        aria-label="Navigasi utama"
      >
        <Link href="/" className="group flex items-center gap-2 pr-2">
          <span className="bg-mk-brand text-mk-ink grid size-8 place-items-center rounded-full text-sm font-bold transition-transform duration-300 group-hover:rotate-12">
            U
          </span>
          <span className="text-sm font-semibold tracking-tight">
            chat<span className="text-mk-brand-deep">umkm</span>
          </span>
        </Link>

        <div className="ml-auto hidden items-center gap-6 text-sm md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-active={isActive(pathname, link.href)}
              className="mk-link text-mk-muted hover:text-mk-ink data-[active=true]:text-mk-ink"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="bg-mk-ink text-mk-cream hidden rounded-full px-4 py-2 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5 sm:block"
          >
            Masuk
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Tutup menu" : "Buka menu"}
            className="border-mk-line grid size-9 place-items-center rounded-full border md:hidden"
          >
            {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-mk-line bg-mk-surface pointer-events-auto absolute inset-x-4 top-20 rounded-3xl border p-3 shadow-xl md:hidden">
          <div className="grid gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:bg-mk-brand/15 rounded-2xl px-4 py-3 text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="bg-mk-ink text-mk-cream mt-1 rounded-2xl px-4 py-3 text-center text-sm font-medium">
              Masuk ke dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Ganti tema"
      className="border-mk-line text-mk-muted hover:text-mk-ink grid size-9 place-items-center rounded-full border transition-colors"
    >
      {mounted && resolvedTheme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
