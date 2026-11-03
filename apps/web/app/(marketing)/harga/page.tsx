import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";

const PLANS = [
  {
    name: "Gratis",
    price: "Rp 0",
    cadence: "selamanya",
    tagline: "Untuk toko yang baru mulai merapikan catatan.",
    features: ["1 toko, 1 pengguna", "Chat, Input Cepat, Impor", "Riwayat 3 bulan", "Ringkasan penjualan dasar"],
    missing: ["Kesiapan data ML", "Ekspor laporan"],
    cta: "Mulai gratis",
  },
  {
    name: "Toko",
    price: "Rp 49.000",
    cadence: "per bulan",
    tagline: "Untuk toko harian yang butuh angka setiap hari.",
    features: ["1 toko, 3 pengguna", "Semua fitur Gratis", "Riwayat tanpa batas", "Kesiapan data ML", "Ekspor laporan"],
    missing: [],
    cta: "Pilih Toko",
    featured: true,
  },
  {
    name: "Grosir",
    price: "Rp 149.000",
    cadence: "per bulan",
    tagline: "Untuk beberapa cabang dengan satu pemilik.",
    features: ["Hingga 5 toko", "Semua fitur Toko", "Ringkasan lintas toko", "Prioritas dukungan"],
    missing: [],
    cta: "Hubungi kami",
  },
];

const FAQ = [
  {
    q: "Apakah data toko saya dipakai untuk melatih model?",
    a: "Tidak. Model machine learning bersifat global dan read-only. Data tokomu hanya dipakai untuk menghitung kesiapan dan menjawab pertanyaanmu sendiri.",
  },
  {
    q: "Kalau saya berhenti, apakah catatan hilang?",
    a: "Kamu bisa ekspor seluruh transaksi dalam format CSV sebelum berhenti. Setelah itu data dihapus sesuai permintaan.",
  },
  {
    q: "Butuh internet cepat?",
    a: "Tidak. Halaman dibuat ringan dan bisa dipakai di koneksi seluler biasa. Impor file besar sebaiknya dilakukan saat ada Wi-Fi.",
  },
  {
    q: "Apakah bisa dipakai lebih dari satu orang?",
    a: "Bisa. Paket Toko memberi akses untuk tiga pengguna dengan data toko yang sama.",
  },
];

export default function HargaPage() {
  return (
    <main>
      <section className="px-4 pt-36 pb-14 sm:pt-44">
        <div className="mx-auto max-w-6xl text-center">
          <p className="mk-eyebrow mk-enter">Harga</p>
          <h1 className="mk-display mk-enter mx-auto mt-5 max-w-3xl text-[clamp(2.5rem,5.5vw,4.4rem)] [animation-delay:80ms]">
            Semurah satu gelas kopi
            <span className="text-mk-brand-deep block italic">per bulan.</span>
          </h1>
          <p className="text-mk-muted mk-enter mx-auto mt-6 max-w-xl text-base leading-relaxed [animation-delay:160ms]">
            Mulai gratis tanpa batas waktu. Naik paket hanya kalau tokomu sudah rutin memakai datanya.
          </p>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3 lg:items-start">
          {PLANS.map((plan, index) => (
            <article
              key={plan.name}
              className={`mk-reveal relative flex h-full flex-col p-6 sm:p-8 ${
                plan.featured ? "mk-card-ink lg:-mt-4 lg:mb-4" : "mk-card"
              }`}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              {plan.featured && (
                <span className="bg-mk-brand text-mk-ink absolute -top-3 left-6 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide">
                  Paling pas
                </span>
              )}
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className={`mt-1 text-sm ${plan.featured ? "opacity-70" : "text-mk-muted"}`}>{plan.tagline}</p>

              <div className="mt-6 flex items-end gap-1">
                <span className="mk-display text-4xl">{plan.price}</span>
                <span className={`pb-1 text-xs ${plan.featured ? "opacity-70" : "text-mk-muted"}`}>/ {plan.cadence}</span>
              </div>

              <ul className="mt-6 grid flex-1 gap-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="text-mk-brand mt-0.5 size-4 shrink-0" aria-hidden />
                    {feature}
                  </li>
                ))}
                {plan.missing.map((feature) => (
                  <li key={feature} className={`flex items-start gap-2 ${plan.featured ? "opacity-45" : "text-mk-muted/70"}`}>
                    <Minus className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5 ${
                  plan.featured ? "bg-mk-brand text-mk-ink" : "bg-mk-ink text-mk-cream"
                }`}
              >
                {plan.cta}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </article>
          ))}
        </div>

        <p className="text-mk-muted mx-auto mt-6 max-w-3xl text-center text-xs">
          Harga perkenalan. Belum termasuk pajak. Bisa berubah dengan pemberitahuan 30 hari.
        </p>
      </section>

      <section className="border-mk-line bg-[var(--mk-surface)] border-y px-4 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mk-eyebrow">Tanya jawab</p>
            <h2 className="mk-display mk-reveal mt-4 text-[clamp(2rem,4vw,3rem)]">Hal yang biasanya ditanya pemilik toko.</h2>
          </div>
          <div className="grid gap-2">
            {FAQ.map((item) => (
              <details key={item.q} className="mk-card group p-0 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 text-sm font-medium">
                  {item.q}
                  <span className="text-mk-brand-deep transition-transform duration-200 group-open:rotate-45">+</span>
                </summary>
                <p className="text-mk-muted px-5 pb-5 text-sm leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="mk-halo mk-card mx-auto max-w-4xl p-8 text-center sm:p-12">
          <h2 className="mk-display text-[clamp(1.8rem,3.5vw,2.8rem)]">Masih ragu? Coba paket gratisnya dulu.</h2>
          <p className="text-mk-muted mx-auto mt-3 max-w-lg text-sm leading-relaxed">
            Tidak perlu kartu kredit. Kalau tidak cocok, berhenti tanpa kehilangan catatan yang sudah diekspor.
          </p>
          <Link
            href="/login"
            className="bg-mk-ink text-mk-cream group mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5"
          >
            Mulai gratis
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  );
}
