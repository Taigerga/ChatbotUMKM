import Link from "next/link";
import { ArrowRight, BrainCircuit, ChevronRight, MessageSquare, ShieldCheck, Store, Table2 } from "lucide-react";

const STEPS = [
  {
    icon: Store,
    title: "Siapkan toko",
    body: "Buat akun, beri nama toko. Belum perlu mengisi apa pun. Katalog boleh kosong di hari pertama.",
    detail: ["1 akun = 1 toko", "Bisa tambah produk sambil jalan", "Tanpa impor wajib"],
  },
  {
    icon: MessageSquare,
    title: "Catat lewat obrolan",
    body: "Tulis transaksi seperti menceritakan ke pegawai. Chatbot menyusun pratinjau lengkap dengan produk dan pelanggan yang belum ada.",
    detail: ["Pratinjau sebelum simpan", "Harga dan total dihitung otomatis", "Bisa dibatalkan kapan saja"],
  },
  {
    icon: Table2,
    title: "Rapikan data lama",
    body: "Kalau punya file Excel, unggah lewat menu Impor. Petakan kolom, cek hasil validasi, konfirmasi sekali.",
    detail: ["CSV dan XLSX", "Baris bermasalah ditandai", "Riwayat impor tersimpan"],
  },
  {
    icon: BrainCircuit,
    title: "Pakai untuk keputusan",
    body: "Minta ringkasan, cek kesiapan data, lalu lihat prediksi kalau datanya sudah cukup. Kalau belum, sistem bilang apa yang kurang.",
    detail: ["Model global, read-only", "Kesiapan dihitung per toko", "Tidak memaksa prediksi"],
  },
];

const EXAMPLES = [
  { ask: "Penjualan hari ini berapa?", answer: "Rp 1.284.000 dari 23 transaksi. Tertinggi: kopi susu (18 cangkir)." },
  { ask: "Stok apa yang perlu ditambah?", answer: "3 produk di bawah batas: roti bakar, gula aren, cup 12 oz." },
  { ask: "Pelanggan mana yang berhenti belanja?", answer: "5 pelanggan terakhir belanja >30 hari lalu. Mau saya buatkan daftarnya?" },
];

export default function CaraKerjaPage() {
  return (
    <main>
      <section className="px-4 pt-36 pb-14 sm:pt-44">
        <div className="mx-auto max-w-6xl">
          <p className="mk-eyebrow mk-enter">Cara kerja</p>
          <h1 className="mk-display mk-enter mt-5 max-w-3xl text-[clamp(2.5rem,5.5vw,4.4rem)] [animation-delay:80ms]">
            Dari obrolan pagi
            <span className="text-mk-brand-deep block italic">jadi keputusan sore.</span>
          </h1>
          <p className="text-mk-muted mk-enter mt-6 max-w-2xl text-base leading-relaxed [animation-delay:160ms]">
            Tidak ada instalasi, tidak ada pelatihan panjang. Empat langkah, dan toko kamu sudah punya catatan yang bisa ditanya.
          </p>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="mx-auto max-w-6xl">
          <ol className="relative grid gap-4">
            <span className="bg-mk-line absolute top-8 bottom-8 left-6 hidden w-px md:block" aria-hidden />
            {STEPS.map((step, index) => (
              <li key={step.title} className="mk-reveal relative md:pl-16" style={{ animationDelay: `${index * 90}ms` }}>
                <span className="bg-mk-brand text-mk-ink absolute left-0 top-6 hidden size-12 place-items-center rounded-full text-sm font-bold md:grid">
                  0{index + 1}
                </span>
                <div className="mk-card grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <step.icon className="text-mk-brand-deep size-5" aria-hidden />
                      <h2 className="text-lg font-semibold sm:text-xl">{step.title}</h2>
                    </div>
                    <p className="text-mk-muted mt-3 text-sm leading-relaxed">{step.body}</p>
                  </div>
                  <ul className="grid gap-2 text-sm">
                    {step.detail.map((item) => (
                      <li key={item} className="border-mk-line flex items-center gap-2 rounded-xl border px-3 py-2">
                        <ChevronRight className="text-mk-brand-deep size-3.5 shrink-0" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-mk-line bg-[var(--mk-surface)] border-y px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mk-eyebrow mk-reveal">Contoh nyata</p>
          <h2 className="mk-display mk-reveal mt-4 max-w-2xl text-[clamp(2rem,4vw,3rem)]">Pertanyaan yang bisa kamu lempar pagi ini.</h2>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {EXAMPLES.map((example, index) => (
              <div key={example.ask} className="mk-card mk-reveal p-6" style={{ animationDelay: `${index * 80}ms` }}>
                <p className="text-xs font-semibold">“{example.ask}”</p>
                <p className="border-mk-line text-mk-muted mt-4 border-l-2 pl-3 text-sm leading-relaxed">{example.answer}</p>
              </div>
            ))}
          </div>

          <p className="text-mk-muted mk-reveal mt-8 flex items-start gap-2 text-xs">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Angka di atas contoh tampilan. Angka tokomu diambil langsung dari data yang kamu konfirmasi sendiri.
          </p>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="mk-halo mk-card mx-auto max-w-5xl p-8 sm:p-12">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <h2 className="mk-display text-[clamp(1.8rem,3.5vw,2.8rem)]">Mau lihat harganya dulu?</h2>
              <p className="text-mk-muted mt-3 max-w-lg text-sm leading-relaxed">
                Mulai dari paket gratis untuk satu toko. Naik paket hanya kalau kamu butuh fitur tambahan.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/harga"
                className="bg-mk-ink text-mk-cream group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5"
              >
                Lihat harga
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link
                href="/login"
                className="border-mk-line hover:bg-mk-cream inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition-colors"
              >
                Coba dulu
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
