# Desain: UI "Warung Modern" + Machine Learning global terkalibrasi

Tanggal: 2026-11-10
Status: menunggu persetujuan

## 1. Tujuan

1. Seluruh UI aplikasi (dashboard, chatbot, POS, login, marketing) memakai satu bahasa visual hangat ala warung/retail kelontong Indonesia: kertas krem, tinta hangat, satu aksen amber, tanpa gradien dan tanpa panel tembus pandang.
2. Halaman Machine Learning bisa dipakai pemilik toko awam: setiap model menjelaskan "apa ini", "temuan", dan "sebaiknya apa" sebelum angka teknis.
3. Model global dataset 150k tetap menjadi mesin utama, dengan kalibrasi skala ke data toko (bukan latih ulang).

## 2. Keputusan yang sudah diambil

- Arah UI: **Lapisan "Warung" di atas shadcn** (opsi B). Token + komponen shadcn dirapikan, lalu 5 primitif khas ditambahkan.
- Arah ML: **Global + kalibrasi** (opsi B). Model global tidak dilatih ulang; baseline, skala, dan nama produk disesuaikan agar masuk akal untuk toko.
- Navigasi tetap satu item sidebar "Machine Learning" dengan 3 tab.

## 3. Goals / Non-goals / Anti-goals

**Goals**
- Satu sistem visual konsisten di 14 halaman + komponen bersama.
- Market basket tidak lagi menyuruh pengguna menebak produk dan tidak lagi menampilkan "Tidak ada rekomendasi".
- Ramalan dan anomali menampilkan angka rupiah yang wajar.
- Semua angka teknis tetap tersedia, tapi tersembunyi di balik "Lihat detail teknis".

**Non-goals**
- Tidak mengganti backend, skema database, atau menambah dependensi baru selain komponen shadcn dan font.
- Tidak melatih ulang model global dari data tenant.
- Tidak mengubah bentuk respons chatbot yang sudah ada.
- Tidak mendesain ulang alur bisnis atau menambah fitur baru di luar penjelasan dan kalibrasi.

**Anti-goals**
- Gradien, glow, glassmorphism, `backdrop-blur`, emoji sebagai ikon.
- Dua aksen bersaing (amber dan hijau sama-sama tombol utama).
- Animasi pada angka yang sedang dibaca pengguna.
- Label "AI" atau istilah model di judul kartu utama.

## 4. Prinsip visual "Warung Modern"

**Palet (satu aksen: amber)**
- `--background` kertas krem `oklch(0.974 0.018 84)`.
- `--card` kertas terang `oklch(0.995 0.008 84)`.
- `--foreground` tinta hangat `oklch(0.215 0.024 60)`.
- `--primary` amber warung `oklch(0.745 0.157 62)` dengan teks tinta gelap.
- `--border` tinta 14% opasitas.
- Hijau/merah hanya untuk status semantik (siap, risiko), bukan dekorasi.
- Mode gelap: tinta hangat `oklch(0.185 0.016 60)` + amber lebih terang.

**Tipografi**
- Judul/display: Fraunces (via `next/font/google`, variabel `--font-display`), bobot 600, tracking rapat.
- UI: Geist (sudah ada).
- Angka harga/statistik: Geist Mono.
- Label kecil: uppercase, tracking 0.16em, 11px.

**Bentuk (shape lock)**
- Kartu: 12px. Input & tombol: 10px. Badge: pill. Dialog: 16px.
- Tidak ada sudut campur tanpa alasan.

**Material**
- Latar krem + tekstur kertas halus (SVG noise) satu lapis, opasitas rendah.
- Kartu: garis tinta 1px + bayangan kertas tipis. Tanpa glow berwarna.
- Tidak ada panel transparan; header dan sidebar opak.

**Gerak**
- Masuk halaman: 240–280ms ease-out, stagger maksimum 6 item, 40ms.
- Hover angkat 2px hanya pada kartu yang bisa diklik.
- Tombol: tekan turun 1px, 120ms.
- Tab: indikator garis bawah bergeser 180ms.
- Bar chart tumbuh sekali saat data muncul (state change), bukan loop.
- `prefers-reduced-motion`: semua animasi spasial diganti fade atau dimatikan.

**Primitif khas (baru, di `apps/web/components/warung/`)**
- `SectionHeader`: eyebrow + judul serif + garis tinta + aksi kanan.
- `PriceTag`: angka besar mono dengan ekor label harga (notch kiri) untuk omzet/statistik.
- `ReceiptCard`: kartu bergaya nota (tepi putus-putus, header nota, total di bawah).
- `HumanNote`: kotak "Artinya buat toko Anda" untuk penjelasan awam.
- `EmptyState`: ikon lucide, kalimat sebab, satu aksi jelas.
- `StatStrip`: deretan angka kunci ringkas untuk atas halaman.

Semua primitif memakai token shadcn; tidak membuat sistem warna sendiri.

## 5. Komponen shadcn yang ditambahkan

Ditambahkan lewat CLI di `apps/web` (style `base-nova`), lalu diff diperiksa agar `globals.css` tidak tertimpa:
`tabs`, `accordion`, `tooltip`, `skeleton`, `progress`, `separator`, `select`, `sheet`.

Alasan:
- `tabs` untuk 3 tab ML dan pengaturan.
- `accordion` untuk "Lihat detail teknis" dan "Yang perlu diketahui".
- `tooltip` untuk istilah yang tidak bisa dihindari.
- `skeleton` untuk loading yang mengikuti bentuk akhir.
- `progress` untuk kesiapan data dan langkah pelatihan.
- `separator` untuk pemisah bergaya nota.
- `select` untuk filter kategori/status.
- `sheet` untuk navigasi mobile (menggantikan panel kustom).

Tidak ditambahkan: `sonner`, `table`, `command`, `dropdown-menu` — belum ada kebutuhan nyata.

## 6. Penerapan per area

**Shell**
- `packages/ui/src/styles/globals.css`: token hangat jadi default; `--radius: 0.75rem`; `--font-display`.
- `app/layout.tsx`: muat Fraunces.
- `dashboard.css`: **hapus seluruh blok override token cool-blue `.dash`** (12 halaman dashboard memakai `globals.css` hangat), hapus dua radial-gradient dan `backdrop-blur`, ganti animasi lama, tambah grain, hover hanya kartu interaktif.
- `marketing.css`: `--mk-*` menjadi alias tipis ke token global (tidak menyimpan palet duplikat); grain dan layout marketing tetap.
- `sidebar.tsx`: latar opak, item aktif amber dengan penanda kiri, tanpa blur.
- `header.tsx`: opak, garis bawah tinta, badge status jadi cap.
- `mobile-nav.tsx`: pakai `sheet`.

**Login** — kartu nota, judul serif, latar kertas, satu tombol utama.

**Dashboard (Ringkasan, Transaksi, Buku Penjualan, Produk, Pelanggan, Impor, Pengaturan, Input Cepat)** — header seksi konsisten, statistik pakai `PriceTag`, tabel bergaris tinta tipis dengan header uppercase, filter pakai `select`, empty/error state memakai `EmptyState`, form memakai jarak dan radius baru.

**Chatbot** — bubble pesan hangat, composer opak, riwayat dengan penanda aktif, action card memakai `ReceiptCard`, empty state dengan contoh pertanyaan.

**Marketing** — hapus `.mk-halo` (gradien), pertahankan palet krem dan grain yang sudah ada, samakan radius/tombol dengan dashboard, animasi masuk yang sama.

**ML — tab Ringkasan (sebelumnya Status Data)**
- Kesiapan data: 5 baris dengan `progress` + kalimat awam.
- Status model global: kartu ringkas, label "Model umum dataset 150k", detail teknis di accordion.

**ML — tab Analisis Cerdas (global + kalibrasi)**
Urutan kartu: Ramalan → Pelanggan → Risiko berhenti → Hari tidak wajar → Sering dibeli bersama.

1. **Ramalan**
   - Judul: "Perkiraan penjualan 7 hari ke depan".
   - Angka utama: rata-rata per hari + total minggu, dalam rupiah.
   - Tren: naik/turun dibanding 30 hari terakhir.
   - Grafik garis amber, tanpa grid mencolok.
   - Detail teknis: MAPE + catatan kalibrasi.

2. **Pelanggan (RFM)**
   - Pemetaan label dari model global: `Champion*` → Pelanggan setia, `Loyal*` → Pelanggan rutin, `At Risk*` → Perlu ditebus, `Lost*` → Hampir hilang. Sufiks duplikat (`Champion 3`) digabung ke label induk; cluster tak dikenal → `Segmen {n}`.
   - Tiap segmen: jumlah pelanggan, rata-rata belanja, satu saran tindakan. Urut jumlah terbanyak.
   - Segmen kosong tidak dirender.
   - Detail pelanggan di accordion.

3. **Risiko berhenti (churn)**
   - Tanpa persentase palsu. Tiga tingkat: Tinggi / Sedang / Rendah, ditentukan dari peringkat skor model global.
   - Daftar 10 nama + "terakhir belanja X hari lalu" + saran "Hubungi lewat WhatsApp/promo".
   - Detail teknis: PR-AUC + penjelasan satu kalimat.

4. **Hari tidak wajar (anomali)**
   - Kalibrasi: pola hari-dalam-minggu dari model global, baseline diskalakan ke median toko.
   - Salin: "3 hari penjualan jauh di atas/bawah kebiasaan".
   - Daftar tanggal + nilai + arah (lebih ramai/lebih sepi), bukan z-score.
   - Grafik garis dengan titik ditandai.

5. **Sering dibeli bersama**
   - Panel A "Sering dibeli bersama di toko Anda": 5 pasangan dari transaksi toko (hitung pasangan, bukan model), format "Pembeli Beras juga beli Telur — 8 dari 20 transaksi (40%)".
   - Panel B "Contoh dari dataset umum": 3 aturan global sebagai referensi, diberi label jelas "produk dataset umum, bukan produk toko".
   - Tidak ada input wajib. Opsional: klik pasangan untuk melihat saran "jika pelanggan beli A, tawarkan B".
   - Empty state bila belum ada transaksi multi-item: jelaskan cara mengisinya.

**ML — tab Model Toko**
- Tombol utama "Latih ulang model toko"; progres memakai `progress` + langkah teks.
- Tiap kartu: nama awam, status (Siap dipakai / Perlu data / Belum dilatih), "Apa gunanya", temuan utama, tindakan, lalu accordion "Yang perlu diketahui" + "Detail teknis".
- Tetap menampilkan hasil per-tenant yang sudah ada (ramalan, segmen, aturan, risiko, anomali).

## 7. Perubahan backend ML (tanpa latih ulang global)

**Forecasting** — `POST /predict/forecasting` menerima `target_daily` opsional. Bila diisi, prediksi global diskalakan dengan rasio `target_daily / rata-rata prediksi`. Bentuk tren tetap dari model global.
- `target_daily` = rata-rata omzet **per hari kalender** 30 hari terakhir (hari tanpa transaksi dihitung 0), bukan rata-rata hari yang ada transaksi.
- Tanggal prediksi di-anchor ke hari ini (`today + 1 … today + horizon`), bukan `last_date` artefak global (2025-12-31). Respons menambah `calibration: { factor, target_daily, anchored_to: "today" }`.

**Anomaly** — `POST /predict/anomaly` menerima `calibrate: true`.
- Rentang tanggal di-zero-fill (hari tanpa transaksi = 0) dari transaksi pertama sampai terakhir.
- Ambil multiplier hari-dalam-minggu dari model global (`median_weekday / median_global`).
- Baseline tenant = median tenant × multiplier. Skala = MAD dari **residual** `value - baseline`, bukan MAD nilai mentah (agar ayunan weekday tidak menyembunyikan anomali).
- Threshold tetap 3.5 dari model global.
- Respons sama bentuknya + `baseline_source: "global_pattern_scaled"`; `is_anomaly` dihitung dari residual z-score.

**RFM** — `POST /predict/rfm` menerima `calibrate: true`.
- Scaler di-fit pada fitur pelanggan toko; model KMeans global tetap dipakai untuk menetapkan cluster.
- Label segmen tetap dari model global, diterjemahkan di UI.

**Churn** — model global tetap. API mengubah skor menjadi band prioritas berdasarkan kuantil populasi toko:
- Hanya pelanggan yang pernah bertransaksi (`order_count > 0`) yang masuk daftar dan band. Pelanggan tanpa transaksi tidak ditampilkan sebagai "9999 hari".
- `high` = 10% teratas (minimal 1), `medium` = 20% berikutnya (minimal 1), sisanya `low`.
- Bila pelanggan bertransaksi < 5, semua `medium` + catatan "data masih sedikit".
- Persentase tidak ditampilkan; yang tampil `lastPurchaseDays`.

**MBA** — `POST /predict/mba` tetap ada untuk referensi global. Panel toko dihitung di `MlInsightsService` dari `transactions` yang sudah dikumpulkan:
- Pasangan dihitung dengan `itertools.combinations` equivalent di TS.
- Min support = `max(3 / total, 0.01)`, urut lift lalu confidence, ambil 5.

**Chatbot** — `ChatReadTools` tetap memakai `MlInsightsService`, bentuk keluaran lama dipertahankan. Kalibrasi hanya memengaruhi isi, bukan struktur.

## 8. Kontrak data baru

```ts
// insights/forecast
{ horizon, predictions: {date,value}[], calibration: {factor, targetDaily},
  summary: { dailyAverage, weeklyTotal, trendPct }, warning }

// insights/rfm
{ customerCount, segments: {customer_id,name,segment,segmentLabel,recency,frequency,monetary}[],
  groups: {segment,label,customers,avgMonetary,action}[], warning }

// insights/churn
{ customerCount, risks: {customer_id,name,lastPurchaseDays,band:"high"|"medium"|"low",score}[],
  counts: {high,medium,low}, warning }

// insights/anomaly
{ days, anomalyCount, series, anomalies: {date,value,baseline,direction}[], warning }

// insights/mba
{ tenantPairs: {a,b,count,total,confidence}[], globalReference: Rule[], warning }
```

Semua label bahasa Indonesia. Nama field teknis tetap bahasa Inggris agar konsisten dengan kode yang ada.

## 9. State yang wajib ada

- Loading: skeleton berbentuk kartu/daftar, bukan teks "Memuat...".
- Kosong: sebab + satu aksi.
- Error: spesifik + tombol coba lagi.
- Model global belum siap: kartu "Model umum belum tersedia" + status layanan ML.
- Model toko belum dilatih: ajakan latih, bukan hasil kosong.
- Data toko kurang: jelaskan ambang yang belum terpenuhi.

## 10. Aksesibilitas

- Kontras teks minimal 4.5:1; amber tidak dipakai untuk teks di atas krem tanpa tinta gelap.
- Fokus terlihat (`focus-visible` ring 3px).
- Semua ikon dekoratif `aria-hidden`; tombol ikon punya `aria-label`.
- Grafik punya ringkasan teks di luar SVG.
- Target sentuh minimal 40px di mobile.
- Hormati `prefers-reduced-motion`.

## 11. Verifikasi

- `pytest` untuk kalibrasi forecasting/anomaly/RFM (3 tes baru + 6 tes lama).
- `npm run typecheck`, `npm run build` di web; `nest build` + unit + e2e API.
- `grep` memastikan tidak ada `radial-gradient`, `linear-gradient`, `backdrop-blur` di UI.
- Data verifikasi: tenant `iluminati270306@gmail.com` (`cmvw8sfms0001rcv27kndtwjw`) yang sudah berisi 648 penjualan posted, 264 hari transaksi, 66 pelanggan bertransaksi, dan 440 transaksi multi-item — bukan fixture seed e2e yang kecil.
- Browser: screenshot 1440px dan 390px untuk login, Ringkasan, Chatbot, Produk, ML (3 tab), marketing home. Cek keyboard focus dan satu alur latih ulang model.
- Angka yang diverifikasi: anomali < 15 hari, ramalan dalam orde rupiah toko, segmen tidak 65:1, panel pasangan toko berisi minimal 3 pasangan.

## 12. Risiko

- Kalibrasi menyelaraskan besar angka, bukan musiman sebenarnya. Label "pola dari model umum, skala disesuaikan" wajib tampil.
- Nama produk global tidak akan cocok dengan katalog toko; karena itu panel toko dipisah jelas.
- `shadcn add` bisa menimpa `globals.css`; diff diperiksa sebelum commit.
- Fraunces menambah unduhan font; hanya subset latin, satu bobot.
- Animasi berlebih pada data; dibatasi pada kemunculan, bukan gerak terus-menerus.

## 13. Di luar cakupan

- Melatih ulang model global dengan data toko.
- Menambah model baru.
- Push/PR (dilakukan terpisah setelah persetujuan).
