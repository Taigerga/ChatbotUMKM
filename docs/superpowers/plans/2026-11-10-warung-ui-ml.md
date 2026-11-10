# UI Warung Modern + ML Global Terkalibrasi — Rencana Implementasi

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Menyeragamkan seluruh UI ke tema warung hangat dan membuat halaman ML bisa dipahami pemilik toko, tanpa melatih ulang model global.

**Architecture:** Token hangat global di `packages/ui`, primitif Warung di `apps/web/components/warung`, halaman memakai komponen shadcn + primitif tersebut. ML global tetap, kalibrasi dilakukan di Python/TS sebelum ditampilkan.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, shadcn (base-nova), recharts, FastAPI, scikit-learn, NestJS.

**Spec:** `docs/superpowers/specs/2026-11-10-warung-ui-ml-design.md`

## Global Constraints

- Tanpa gradien, `backdrop-blur`, glassmorphism, emoji ikon.
- Satu aksen amber; hijau/merah hanya status.
- Radius: kartu 12px, tombol/input 10px, badge pill.
- Semua animasi hormati `prefers-reduced-motion`.
- Model global tidak dilatih ulang, kecuali churn (keputusan uji: Logistic Regression).
- Respons chatbot tidak berubah bentuk.
- Copy UI bahasa Indonesia, tanpa jargon di lapisan utama.

## Review Focus

- Data toko kosong / kurang dari ambang: harus muncul empty state dengan aksi, bukan angka 0 atau NaN.
- Hari tanpa transaksi: zero-fill agar kalibrasi dan anomali tidak meleset.
- Pelanggan tanpa transaksi: tidak boleh muncul sebagai "9999 hari".
- Nama produk toko tidak ada di aturan global: dua panel terpisah, bukan hasil kosong.
- Mode gelap dan lebar 390px: kontras dan navigasi tetap benar.

---

### Task 1: Churn global ke Logistic Regression

**Files:** `ml/src/models/churn.py`, `ml/tests/test_churn.py` (baru)
**Interfaces:** `train() -> dict`, `predict(customers: list[dict]) -> list[dict]` tidak berubah.

- [ ] Tulis tes: artefak churn memakai pipeline LogisticRegression; `predict` mengembalikan 0..1.
- [ ] Jalankan tes, pastikan gagal.
- [ ] Ganti `RandomForestClassifier` dengan `make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, class_weight="balanced"))`; simpan metadata `algorithm: "logistic_regression"`, `metrics` tetap.
- [ ] Latih ulang artefak global, jalankan `pytest`, pastikan lulus.
- [ ] Commit.

### Task 2: Sistem token, font, shell

**Files:** `packages/ui/src/styles/globals.css`, `apps/web/app/layout.tsx`, `apps/web/app/(dashboard)/dashboard.css`, `apps/web/app/(marketing)/marketing.css`, `apps/web/components/layout/{sidebar,header,mobile-nav}.tsx`, `apps/web/package.json` (shadcn add)
- [ ] Tambah Fraunces via `next/font/google` (`--font-display`).
- [ ] Ganti token `:root`/`.dark` ke krem–tinta–amber; `--radius: 0.75rem`.
- [ ] Hapus blok `.dash` cool-blue, semua gradien, `backdrop-blur`; `.mk-*` jadi alias token global.
- [ ] Tambah grain kertas, animasi 240–280ms, hover hanya kartu interaktif.
- [ ] Tambah shadcn: tabs, accordion, tooltip, skeleton, progress, separator, select, sheet.
- [ ] Perbarui sidebar/header/mobile-nav (sheet).
- [ ] `npm run typecheck` web, commit.

### Task 3: Primitif Warung

**Files:** `apps/web/components/warung/{section-header,price-tag,receipt-card,human-note,empty-state,stat-strip}.tsx`
- [ ] Buat 6 komponen memakai token, tanpa gradien.
- [ ] Ganti loading/empty state minimal di satu halaman (Ringkasan) sebagai bukti.
- [ ] `npm run typecheck`, commit.

### Task 4: Halaman dashboard + login + chat + marketing

**Files:** `app/(auth)/login/page.tsx`, `app/(dashboard)/{overview,transactions,sales-book,products,customers,imports,settings,input}/page.tsx`, `components/chat/*`, `components/sales/sale-editor.tsx`, `app/(marketing)/*`
- [ ] Ganti heading ke `SectionHeader`, statistik ke `PriceTag`/`StatStrip`, tabel/filter ke komponen baru.
- [ ] Ganti loading/error/empty ke `EmptyState`/`Skeleton`.
- [ ] Chat: bubble hangat, composer opak, action card `ReceiptCard`.
- [ ] Marketing: hapus `mk-halo`, samakan tombol/radius.
- [ ] `npm run typecheck`, `npm run build`, commit.

### Task 5: Kalibrasi ML backend

**Files:** `ml/src/models/{forecasting,anomaly,rfm}.py`, `ml/src/service.py`, `apps/api/src/modules/ml/ml-insights.service.ts`, `apps/api/src/modules/ml/ml.service.ts`, `ml/tests/test_calibration.py`
- [ ] Forecasting: `target_daily` opsional, skala, anchor `today`, respons `calibration`.
- [ ] Anomaly: `calibrate=True`, zero-fill, weekday multiplier global + residual MAD.
- [ ] RFM: `calibrate=True`, scaler fit ke tenant.
- [ ] API: hitung target_daily kalender 30 hari, kirim flag kalibrasi.
- [ ] API: churn band (hanya pelanggan pernah beli), MBA dua panel (pasangan tenant + referensi global).
- [ ] Tes Python + `nest build`, commit.

### Task 6: UI ML ramah awam

**Files:** `app/(dashboard)/machine-learning/{page,insights-section,toko-section,status-section,ml-charts}.tsx`, `apps/web/components/warung/*`
- [ ] Tab Ringkasan: progress kesiapan + status global, detail teknis accordion.
- [ ] Analisis Cerdas: 5 kartu dengan `HumanNote` (apa ini / temuan / tindakan), grafik, tanpa jargon di lapisan utama.
- [ ] Market basket: panel toko otomatis + panel referensi global; tanpa input wajib.
- [ ] Model Toko: status awam, "Apa gunanya", hasil, accordion teknis, progress pelatihan.
- [ ] `npm run typecheck`, `npm run build`, commit.

### Task 7: Verifikasi menyeluruh

- [ ] `pytest` ML, `npm test` + `npm run test:e2e` API, `nest build`.
- [ ] `npm run typecheck` + `npm run build` web.
- [ ] Grep: tidak ada `radial-gradient`, `linear-gradient`, `backdrop-blur` di UI.
- [ ] Browser 1440px dan 390px: login, Ringkasan, Chatbot, Produk, ML 3 tab, marketing.
- [ ] Cek angka: anomali < 15, ramalan orde rupiah toko, segmen wajar, pasangan toko ≥ 3.
- [ ] Commit akhir + laporan.
