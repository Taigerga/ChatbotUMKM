import Link from "next/link";

const COLUMNS = [
  {
    title: "Produk",
    links: [
      { href: "/fitur", label: "Fitur" },
      { href: "/cara-kerja", label: "Cara kerja" },
      { href: "/harga", label: "Harga" },
    ],
  },
  {
    title: "Mulai",
    links: [
      { href: "/login", label: "Masuk" },
      { href: "/login", label: "Buat toko baru" },
      { href: "/chat", label: "Buka chatbot" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-mk-line relative z-10 border-t px-4 py-14">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-mk-brand text-mk-ink grid size-8 place-items-center rounded-full text-sm font-bold">U</span>
            <span className="text-sm font-semibold">
              chat<span className="text-mk-brand-deep">umkm</span>
            </span>
          </div>
          <p className="text-mk-muted mt-4 max-w-xs text-sm leading-relaxed">
            Asisten data untuk toko kecil. Catat lewat obrolan, lihat angka yang penting, putuskan tanpa nebak.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="mk-eyebrow">{column.title}</p>
            <ul className="mt-4 grid gap-2 text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-mk-muted hover:text-mk-ink transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-mk-line text-mk-muted mx-auto mt-12 flex max-w-6xl flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Chatbot UMKM. Dibuat untuk pedagang, bukan untuk analis.</p>
        <p>Data toko tetap milik toko.</p>
      </div>
    </footer>
  );
}
