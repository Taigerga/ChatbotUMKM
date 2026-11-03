import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  DatabaseZap,
  FileUp,
  Layers,
  LineChart,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";

const CAPABILITIES = [
  {
    icon: Bot,
    title: "Ngobrol, bukan isi formulir",
    body: "“Jual 2 kopi susu sama 1 roti bakar, bayar QRIS.” Chatbot menyiapkan transaksinya, kamu tinggal konfirmasi.",
    span: "md:col-span-3",
  },
  {
    icon: PlusCircle,
    title: "Input Cepat satu layar",
    body: "Produk, pelanggan, dan transaksi dalam satu form. Cocok kalau kamu lebih suka mengetik rapi.",
    span: "md:col-span-3",
  },
  {
    icon: FileUp,
    title: "Impor data lama",
    body: "Bawa riwayat dari Excel atau CSV. Kolom dipetakan dulu, dicek, baru disimpan.",
    span: "md:col-span-2",
  },
  {
    icon: LineChart,
    title: "Ringkasan yang bisa dipakai",
    body: "Penjualan hari ini, produk terlaris, pelanggan paling sering kembali.",
    span: "md:col-span-2",
  },
  {
    icon: DatabaseZap,
    title: "Kesiapan data ML",
    body: "Lihat seberapa siap datamu sebelum percaya prediksi. Bukan angka ajaib.",
    span: "md:col-span-2",
  },
];

const STEPS = [
  {
    icon: ClipboardList,
    title: "Catat apa adanya",
    body: "Lewat chat, form cepat, atau impor file. Tidak perlu tahu istilah akuntansi.",
    note: "“tambah produk kopi susu 18000, stok 24”",
  },
  {
    icon: Wand2,
    title: "Chatbot merapikan",
    body: "Produk dan pelanggan baru dibuat otomatis, transaksi dihitung, lalu ditampilkan sebagai pratinjau.",
    note: "Pratinjau: 2 item · Rp 46.000 · pelanggan baru",
  },
  {
    icon: CheckCircle2,
    title: "Konfirmasi, lalu putuskan",
    body: "Tidak ada data yang tersimpan tanpa persetujuanmu. Setelah tersimpan, minta ringkasan atau prediksi.",
    note: "“produk apa yang perlu saya tambah stoknya?”",
  },
];

const FIT_MARQUEE = [
  "Warung kopi",
  "Toko kelontong",
  "Katering rumahan",
  "Laundry kiloan",
  "Toko online",
  "Bengkel",
  "Toko roti",
  "Percetakan",
  "Petshop",
  "Sayur keliling",
];

export default function LandingPage() {
  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden px-4 pt-32 pb-16 sm:pt-40 sm:pb-24">
        <div className="mk-halo pointer-events-none absolute inset-x-0 -top-40 h-[520px] opacity-80 blur-2xl" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="mk-enter">
            <span className="mk-chip text-mk-muted inline-flex items-center gap-2 px-3 py-1.5 text-xs">
              <Sparkles className="text-mk-brand-deep size-3.5" aria-hidden />
              Asisten data untuk UMKM Indonesia
            </span>

            <h1 className="mk-display mt-6 text-[clamp(2.75rem,6vw,4.6rem)]">
              Catat sambil ngobrol.
              <span className="text-mk-brand-deep block italic">Putuskan pakai angka.</span>
            </h1>

            <p className="text-mk-muted mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
              Warung dan toko kecil tidak butuh dashboard rumit. Butuh cara cepat mencatat, dan jawaban jelas: hari ini laku apa,
              stok apa yang mau habis, pelanggan mana yang berhenti datang.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="bg-mk-ink text-mk-cream group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5"
              >
                Coba gratis
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link
                href="/cara-kerja"
                className="border-mk-line hover:bg-mk-surface inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition-colors"
              >
                Lihat cara kerjanya
              </Link>
            </div>

            <p className="text-mk-muted mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" aria-hidden /> Tidak ada perubahan tanpa konfirmasi
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" aria-hidden /> Tanpa kartu kredit
              </span>
            </p>
          </div>

          <div className="mk-enter relative [animation-delay:120ms]">
            <ChatPreview />
            <div className="mk-float mk-card absolute -top-6 -left-4 z-10 hidden items-center gap-2 px-3 py-2 text-xs sm:flex [animation-delay:1s]">
              <span className="mk-pulse bg-mk-brand size-2 rounded-full" aria-hidden />
              Penjualan hari ini <strong>Rp 1.284.000</strong>
            </div>
            <div className="mk-float mk-card absolute -right-3 -bottom-6 z-10 hidden items-center gap-2 px-3 py-2 text-xs sm:flex [animation-delay:2s]">
              <Layers className="text-mk-brand-deep size-3.5" aria-hidden />
              3 produk stoknya menipis
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="border-mk-line overflow-hidden border-y py-5">
        <div className="mk-marquee">
          <div className="mk-marquee-track items-center gap-10 pr-10">
            {[...FIT_MARQUEE, ...FIT_MARQUEE].map((item, index) => (
              <span key={`${item}-${index}`} className="text-mk-muted flex items-center gap-10 text-sm whitespace-nowrap">
                {item}
                <span className="bg-mk-brand size-1.5 rounded-full" aria-hidden />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* MASALAH */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="mk-eyebrow mk-reveal">Kenapa catatan toko selalu berantakan</p>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-end">
            <h2 className="mk-display mk-reveal text-[clamp(2rem,4vw,3.2rem)]">
              Masalahnya bukan malas.
              <br />
              Alatnya yang tidak cocok.
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { title: "Buku hilang", body: "Catatan di kertas basah kena tumpahan kuah." },
                { title: "Stok nebak", body: "Baru sadar habis saat pembeli sudah di depan." },
                { title: "Laporan telat", body: "Rekap bulanan dikerjakan tengah malam." },
              ].map((item, index) => (
                <div key={item.title} className="mk-reveal mk-card p-5" style={{ animationDelay: `${index * 80}ms` }}>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-mk-muted mt-2 text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FITUR BENTO */}
      <section id="fitur" className="px-4 pb-20 sm:pb-28">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="mk-eyebrow mk-reveal">Yang bisa kamu lakukan</p>
              <h2 className="mk-display mk-reveal mt-4 max-w-xl text-[clamp(2rem,4vw,3.2rem)]">
                Satu asisten, dari catatan sampai keputusan.
              </h2>
            </div>
            <Link href="/fitur" className="mk-link text-mk-muted hover:text-mk-ink text-sm">
              Lihat semua fitur
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-6">
            {CAPABILITIES.map((item) => (
              <article key={item.title} className={`mk-card mk-reveal group p-6 ${item.span}`}>
                <item.icon
                  className="text-mk-brand-deep size-5 transition-transform duration-300 group-hover:-translate-y-0.5"
                  aria-hidden
                />
                <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                <p className="text-mk-muted mt-2 text-sm leading-relaxed">{item.body}</p>
              </article>
            ))}

            <article className="mk-card-ink mk-reveal flex flex-col justify-between gap-6 p-6 md:col-span-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Data siap atau belum, kelihatan.</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed opacity-75">
                    Model prediksi hanya berguna kalau datanya cukup. Halaman Machine Learning menunjukkan kesiapan per toko, bukan
                    memaksa prediksi dari data kosong.
                  </p>
                </div>
                <DatabaseZap className="size-8 shrink-0 opacity-70" aria-hidden />
              </div>
              <div className="grid gap-3">
                {[
                  { label: "Riwayat transaksi", value: 82 },
                  { label: "Data pelanggan", value: 64 },
                  { label: "Katalog produk", value: 91 },
                ].map((meter) => (
                  <div key={meter.label} className="grid gap-1.5">
                    <div className="flex justify-between text-xs opacity-80">
                      <span>{meter.label}</span>
                      <span>{meter.value}%</span>
                    </div>
                    <div className="mk-meter">
                      <span style={{ width: `${meter.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* CARA KERJA */}
      <section className="border-mk-line bg-[var(--mk-surface)] border-y px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="mk-eyebrow mk-reveal">Tiga langkah</p>
          <h2 className="mk-display mk-reveal mt-4 max-w-2xl text-[clamp(2rem,4vw,3.2rem)]">
            Mulai dari satu transaksi, bukan dari migrasi sistem.
          </h2>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="mk-reveal relative" style={{ animationDelay: `${index * 90}ms` }}>
                <span className="mk-display text-mk-brand-deep/25 absolute -top-6 right-2 text-6xl">{index + 1}</span>
                <div className="mk-card h-full p-6">
                  <step.icon className="text-mk-brand-deep size-5" aria-hidden />
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="text-mk-muted mt-2 text-sm leading-relaxed">{step.body}</p>
                  <p className="border-mk-line text-mk-muted mt-5 border-l-2 pl-3 text-xs italic">{step.note}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Link href="/cara-kerja" className="group text-mk-ink inline-flex items-center gap-2 text-sm font-medium">
              Ikuti alur lengkapnya
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mk-halo mk-card mx-auto max-w-5xl overflow-hidden p-8 text-center sm:p-14">
          <p className="mk-eyebrow mk-reveal">Mulai hari ini</p>
          <h2 className="mk-display mk-reveal mx-auto mt-4 max-w-2xl text-[clamp(2rem,4.5vw,3.4rem)]">
            Toko kecil pun berhak punya data yang rapi.
          </h2>
          <p className="text-mk-muted mk-reveal mx-auto mt-5 max-w-xl text-sm leading-relaxed sm:text-base">
            Buat toko, catat transaksi pertama lewat chat, dan lihat ringkasannya hari ini juga. Tidak perlu mengubah cara jualanmu.
          </p>
          <div className="mk-reveal mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="bg-mk-ink text-mk-cream group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5"
            >
              Buat toko gratis
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link
              href="/harga"
              className="border-mk-line hover:bg-mk-cream inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition-colors"
            >
              Lihat paket
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function ChatPreview() {
  return (
    <div className="mk-card relative p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-mk-line pb-3">
        <div className="flex items-center gap-2">
          <span className="bg-mk-brand text-mk-ink grid size-7 place-items-center rounded-full text-xs font-bold">U</span>
          <div>
            <p className="text-xs font-semibold">Chatbot Toko</p>
            <p className="text-mk-muted text-[10px]">Selalu siap, tidak pernah cuti</p>
          </div>
        </div>
        <span className="mk-chip text-mk-muted px-2 py-1 text-[10px]">09.41</span>
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <p className="bg-mk-ink text-mk-cream ml-auto max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-xs leading-relaxed">
          Jual 2 kopi susu sama 1 roti bakar, pelanggan baru Bu Rina, bayar QRIS
        </p>

        <div className="border-mk-line bg-mk-cream/60 max-w-[92%] rounded-2xl rounded-bl-sm border p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide opacity-60">Pratinjau transaksi</p>
          <div className="mt-2 grid gap-1.5 text-xs">
            <div className="flex justify-between">
              <span>Kopi susu × 2</span>
              <span>Rp 36.000</span>
            </div>
            <div className="flex justify-between">
              <span>Roti bakar × 1</span>
              <span>Rp 10.000</span>
            </div>
            <div className="border-mk-line mt-1 flex justify-between border-t pt-1.5 font-semibold">
              <span>Total</span>
              <span>Rp 46.000</span>
            </div>
          </div>
          <p className="text-mk-muted mt-2 text-[10px]">Pelanggan “Bu Rina” akan dibuat baru.</p>
          <div className="mt-3 flex gap-2">
            <span className="bg-mk-brand text-mk-ink rounded-full px-3 py-1 text-[10px] font-semibold">Konfirmasi</span>
            <span className="border-mk-line rounded-full border px-3 py-1 text-[10px]">Batal</span>
          </div>
        </div>

        <p className="text-mk-muted text-[11px]">
          Tersimpan. Mau saya cek produk yang stoknya tinggal sedikit?
        </p>
      </div>
    </div>
  );
}
