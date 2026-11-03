import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  DatabaseZap,
  FileUp,
  History,
  LineChart,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: Bot,
    title: "Chatbot yang benar-benar mengubah data",
    body: "Bukan cuma menjawab pertanyaan. Kamu bisa menambah produk, mendaftarkan pelanggan, dan mencatat penjualan lewat kalimat biasa. Setiap perubahan tampil sebagai pratinjau lebih dulu.",
    points: ["Pratinjau sebelum simpan", "Auto-buat produk/pelanggan baru", "Bahasa Indonesia sehari-hari"],
    mock: "chat",
  },
  {
    icon: PlusCircle,
    title: "Input Cepat dalam satu form",
    body: "Kalau lebih nyaman mengetik rapi: satu layar berisi produk, pelanggan, dan transaksi. Satu tombol simpan, semuanya tercatat.",
    points: ["Multi-item dalam satu transaksi", "Produk & pelanggan opsional", "Validasi sebelum kirim"],
    mock: "form",
  },
  {
    icon: FileUp,
    title: "Impor CSV dan Excel",
    body: "Punya riwayat penjualan lama? Unggah, petakan kolomnya, lihat hasil validasi, lalu konfirmasi. Baris yang bermasalah ditandai, bukan dibuang diam-diam.",
    points: ["Pemetaan kolom", "Pratinjau per baris", "Riwayat impor tersimpan"],
    mock: "import",
  },
  {
    icon: LineChart,
    title: "Ringkasan yang langsung menjawab",
    body: "Tanya “penjualan minggu ini bagaimana?” dan dapatkan angka yang sama dengan yang dipakai dashboard—bukan perkiraan.",
    points: ["Penjualan per periode", "Produk terlaris", "Pelanggan paling sering kembali"],
    mock: "chart",
  },
  {
    icon: DatabaseZap,
    title: "Kesiapan data sebelum prediksi",
    body: "Model machine learning global hanya bisa dipakai kalau datamu cukup. Halaman ML menunjukkan kelengkapan data per toko dan apa yang perlu dilengkapi.",
    points: ["Skor kesiapan per komponen", "Model read-only", "Tidak ada data toko yang bocor"],
    mock: "meter",
  },
  {
    icon: History,
    title: "Riwayat dan jejak keputusan",
    body: "Setiap percakapan tersimpan. Buka lagi kapan pun untuk mengingat apa yang sudah dicatat dan apa yang disetujui.",
    points: ["Percakapan terakhir dimuat ulang", "Aksi tertunda kedaluwarsa 15 menit", "Bisa dibatalkan"],
    mock: "history",
  },
];

export default function FiturPage() {
  return (
    <main>
      <section className="px-4 pt-36 pb-14 sm:pt-44">
        <div className="mx-auto max-w-6xl">
          <p className="mk-eyebrow mk-enter">Fitur</p>
          <h1 className="mk-display mk-enter mt-5 max-w-3xl text-[clamp(2.5rem,5.5vw,4.4rem)] [animation-delay:80ms]">
            Semua yang dibutuhkan toko kecil.
            <span className="text-mk-brand-deep block italic">Tidak lebih, tidak kurang.</span>
          </h1>
          <p className="text-mk-muted mk-enter mt-6 max-w-2xl text-base leading-relaxed [animation-delay:160ms]">
            Enam kemampuan inti, semuanya bekerja di atas data toko yang sama. Catat sekali, pakai berkali-kali.
          </p>
        </div>
      </section>

      <section className="px-4 pb-24">
        <div className="mx-auto grid max-w-6xl gap-4">
          {FEATURES.map((feature, index) => (
            <article
              key={feature.title}
              className={`mk-card mk-reveal grid gap-8 p-6 sm:p-8 lg:grid-cols-2 lg:items-center ${
                index % 2 === 1 ? "lg:[&>div:first-child]:order-2" : ""
              }`}
            >
              <div>
                <span className="mk-chip text-mk-muted inline-flex items-center gap-2 px-3 py-1 text-[11px]">
                  <feature.icon className="text-mk-brand-deep size-3.5" aria-hidden />
                  0{index + 1}
                </span>
                <h2 className="mt-5 text-xl font-semibold sm:text-2xl">{feature.title}</h2>
                <p className="text-mk-muted mt-3 text-sm leading-relaxed">{feature.body}</p>
                <ul className="mt-5 grid gap-2">
                  {feature.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="text-mk-brand-deep mt-0.5 size-4 shrink-0" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <FeatureMock kind={feature.mock} />
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 pb-24">
        <div className="mk-halo mk-card mx-auto flex max-w-5xl flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
          <div>
            <h2 className="mk-display text-[clamp(1.8rem,3.5vw,2.8rem)]">Coba langsung, tanpa pasang apa pun.</h2>
            <p className="text-mk-muted mt-3 flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4" aria-hidden /> Data uji tidak bercampur dengan data tokomu.
            </p>
          </div>
          <Link
            href="/login"
            className="bg-mk-ink text-mk-cream group inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5"
          >
            Mulai sekarang
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  );
}

function FeatureMock({ kind }: { kind: string }) {
  if (kind === "chat") {
    return (
      <div className="border-mk-line bg-mk-cream/50 grid gap-2 rounded-2xl border p-4 text-xs">
        <p className="bg-mk-ink text-mk-cream ml-auto max-w-[88%] rounded-2xl rounded-br-sm px-3 py-2">
          tambah pelanggan Pak Andi, hp 0812xxxx
        </p>
        <p className="border-mk-line max-w-[88%] rounded-2xl rounded-bl-sm border px-3 py-2">
          Pratinjau: pelanggan baru “Pak Andi”. Simpan?
        </p>
        <div className="flex gap-2">
          <span className="bg-mk-brand text-mk-ink rounded-full px-3 py-1 text-[10px] font-semibold">Konfirmasi</span>
          <span className="border-mk-line rounded-full border px-3 py-1 text-[10px]">Batal</span>
        </div>
      </div>
    );
  }

  if (kind === "form") {
    return (
      <div className="border-mk-line bg-mk-cream/50 grid gap-2 rounded-2xl border p-4 text-xs">
        <p className="text-mk-muted text-[10px] uppercase tracking-wide">Produk · Pelanggan · Transaksi</p>
        <div className="grid grid-cols-2 gap-2">
          <span className="border-mk-line bg-mk-surface rounded-lg border px-2 py-1.5">SKU</span>
          <span className="border-mk-line bg-mk-surface rounded-lg border px-2 py-1.5">Nama</span>
          <span className="border-mk-line bg-mk-surface rounded-lg border px-2 py-1.5">Harga</span>
          <span className="border-mk-line bg-mk-surface rounded-lg border px-2 py-1.5">Stok</span>
        </div>
        <span className="bg-mk-ink text-mk-cream mt-1 rounded-full px-3 py-1.5 text-center text-[10px] font-semibold">
          Simpan semua
        </span>
      </div>
    );
  }

  if (kind === "import") {
    return (
      <div className="border-mk-line bg-mk-cream/50 grid gap-1.5 rounded-2xl border p-4 text-[11px]">
        <div className="text-mk-muted grid grid-cols-3 gap-2 border-b border-mk-line pb-1.5 text-[10px] uppercase tracking-wide">
          <span>tanggal</span>
          <span>produk</span>
          <span>total</span>
        </div>
        {[
          ["2026-10-01", "Kopi susu", "Rp 18.000"],
          ["2026-10-01", "Roti bakar", "Rp 10.000"],
          ["2026-10-02", "Kopi susu", "Rp 36.000"],
        ].map((row) => (
          <div key={row.join()} className="grid grid-cols-3 gap-2">
            {row.map((cell) => (
              <span key={cell} className="truncate">
                {cell}
              </span>
            ))}
          </div>
        ))}
        <p className="text-mk-brand-deep mt-1 text-[10px] font-medium">3 baris valid · 0 error</p>
      </div>
    );
  }

  if (kind === "chart") {
    const bars = [38, 52, 44, 68, 59, 82, 74];
    return (
      <div className="border-mk-line bg-mk-cream/50 rounded-2xl border p-4">
        <p className="text-mk-muted text-[10px] uppercase tracking-wide">Penjualan 7 hari</p>
        <div className="mt-4 flex h-28 items-end gap-2">
          {bars.map((height, index) => (
            <span
              key={index}
              className="bg-mk-brand flex-1 rounded-t-md"
              style={{ height: `${height}%`, opacity: 0.45 + index * 0.07 }}
            />
          ))}
        </div>
        <p className="mt-3 text-xs font-semibold">Rp 4.120.000</p>
      </div>
    );
  }

  if (kind === "meter") {
    return (
      <div className="border-mk-line bg-mk-cream/50 grid gap-3 rounded-2xl border p-4 text-xs">
        {[
          { label: "Transaksi", value: 82 },
          { label: "Pelanggan", value: 64 },
          { label: "Produk", value: 91 },
        ].map((item) => (
          <div key={item.label} className="grid gap-1.5">
            <div className="flex justify-between">
              <span>{item.label}</span>
              <span className="text-mk-muted">{item.value}%</span>
            </div>
            <div className="mk-meter">
              <span style={{ width: `${item.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border-mk-line bg-mk-cream/50 grid gap-2 rounded-2xl border p-4 text-xs">
      {["Siapa pelanggan paling sering beli?", "Penjualan minggu lalu berapa?", "Produk apa yang stoknya menipis?"].map((question) => (
        <p key={question} className="border-mk-line rounded-xl border px-3 py-2">
          {question}
        </p>
      ))}
    </div>
  );
}
