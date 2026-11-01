# ML Global-only + Tahap A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jadikan lima model ML jujur (global-only, metadata + readiness 3 tingkat) dan aktifkan halaman yang fondasinya sudah ada: Overview, Transaksi, Produk, Pelanggan, ML, plus navigasi mobile.

**Architecture:** `ml/` menyimpan metadata di artefak joblib dan mengekspos `/readiness` + `/models`. NestJS meneruskan lewat `/api/v1/ml/*`. Next.js memakai endpoint yang sudah ada (sales/products/customers sudah mendukung limit/offset; overview sudah mendukung from/to dan mengembalikan `daily`).

**Tech Stack:** Python 3.13 + scikit-learn + joblib + FastAPI, NestJS, Next 16 App Router, Tailwind 4, Recharts.

**Spec:** `docs/superpowers/specs/2026-10-31-toko-analitik-ai-design.md`

## Global Constraints

- Model global-only: setiap output wajib berlabel "model global dari dataset publik, bukan data toko".
- Tidak ada kalibrasi/akurasi yang diklaim tanpa metrik nyata.
- Tidak ada mutasi DB dari chat tanpa konfirmasi.
- Uang `Decimal(14,2)`, tanggal ISO.
- Tidak boleh menambah Docker/Redis.
- Halaman yang belum selesai tetap `SOON`; Pengaturan tetap SOON.

## Review Focus

1. Tenant tanpa data membuka Overview → empty state jelas, bukan grafik kosong.
2. Transaksi diedit dari form → item lama tidak terduplikasi.
3. Tanggal filter `to` inklusif sampai akhir hari.
4. Pelanggan/produk diedit dua kali cepat → tidak ada duplikat.
5. ML service mati → halaman ML menampilkan status tidak tersedia, bukan crash.

## Task 1: Metadata + readiness 3 tingkat di ML service

**Files:** `ml/src/metadata.py` (baru), `ml/src/service.py`

**Interfaces:**
- `write_metadata(model_name: str, payload: dict) -> dict` menyimpan `{...payload, trained_at, scope: "global"}`
- `read_artifact(model_name: str) -> dict | None`
- `GET /models` → `{models: {name: {status, samples, metrics, trained_at, data_range, limitations}}}`
- `GET /readiness` → format sama (status + reason)

- [ ] Implement metadata helper, readiness status: `not_ready` (tanpa artefak / sampel kurang dari minimum), `limited` (sampel di bawah ambang nyaman), `ready`.
- [ ] `GET /models` membaca semua artefak dan mengembalikan metadata + `available`.
- [ ] Tes pytest: readiness shape baru + `/models` mengembalikan 5 kunci.

## Task 2: Forecasting jujur

**Files:** `ml/src/models/forecasting.py`

- [ ] Time-based split: 30 hari terakhir sebagai test.
- [ ] Bandingkan LinearRegression vs baseline naive (nilai terakhir); simpan MAE + MAPE model dan baseline.
- [ ] Simpan metadata: samples hari, rentang tanggal, fitur, metrik, horizon.

## Task 3: RFM + K-Means jujur

**Files:** `ml/src/models/rfm.py`

- [ ] Pilih k via silhouette (2..6), simpan inertia + silhouette per k.
- [ ] Beri nama cluster dari peringkat recency/monetary: `Champion`, `Loyal`, `At Risk`, `Lost`, sisanya `Regular`.
- [ ] Simpan metadata: jumlah pelanggan, k terpilih, silhouette, ringkasan cluster.

## Task 4: Market Basket jujur

**Files:** `ml/src/models/mba.py`

- [ ] Simpan jumlah basket, jumlah aturan, min_support, dan peringatan bila basket < 100.

## Task 5: Churn tanpa leakage

**Files:** `ml/src/models/churn.py`

- [ ] Fitur dari transaksi ≤ `OBSERVATION_END = 2024-12-31`; label = tidak ada transaksi pada 365 hari setelahnya.
- [ ] Split berbasis waktu: cohort `first_order <= 2023-12-31` untuk train, sisanya test.
- [ ] Metrik precision/recall/F1/PR-AUC + jumlah sampel per split; simpan ke metadata.

## Task 6: Anomali sadar hari

**Files:** `ml/src/models/anomaly.py`

- [ ] Baseline median + MAD per hari-dalam-minggu, fallback global median/MAD.
- [ ] Skor robust z, ambang 3.5, simpan metadata (samples, metode, ambang).

## Task 7: Proxy API NestJS

**Files:** `apps/api/src/modules/ml/ml.service.ts`, `apps/api/src/modules/ml/ml.controller.ts`

- [ ] `models()` → `GET /ml/models`; teruskan readiness apa adanya.
- [ ] Tes unit tidak berubah; build harus lulus.

## Task 8: Navigasi + mobile

**Files:** `apps/web/components/layout/sidebar.tsx`, `apps/web/components/layout/mobile-nav.tsx`, `apps/web/components/layout/header.tsx`

- [ ] `ready: true` untuk chat, overview, transactions, products, customers, imports, machine-learning; settings tetap SOON.
- [ ] Drawer mobile berisi tautan yang sama, tombol menu di header (komponen client baru).
- [ ] Tanpa dependency baru.

## Task 9: Overview + grafik

**Files:** `apps/web/app/(dashboard)/overview/page.tsx`, `apps/web/package.json`

- [ ] Preset periode 7/30/90 hari + input tanggal; fetch `/overview/summary?from&to`.
- [ ] Grafik tren harian dengan Recharts, empty state bila `daily` kosong.

## Task 10: Transaksi CRUD

**Files:** `apps/web/app/(dashboard)/transactions/page.tsx`

- [ ] Form tambah/edit dengan item dinamis, tanggal, pelanggan opsional.
- [ ] Detail transaksi (buka baris), filter tanggal, pagination, perbaiki render item (`description` + qty).
- [ ] Konfirmasi hapus; error ditampilkan.

## Task 11: Produk & Pelanggan

**Files:** `apps/web/app/(dashboard)/products/page.tsx`, `apps/web/app/(dashboard)/customers/page.tsx`

- [ ] Edit inline (pakai `PUT`), pagination, empty/error state.

## Task 12: Halaman ML

**Files:** `apps/web/app/(dashboard)/machine-learning/page.tsx`

- [ ] Fetch `/ml/models`; kartu per model: status, sampel, trained_at, metrik, keterbatasan, label "global".
- [ ] Tombol latih + polling job sampai `done/failed`.
- [ ] Empty state bila ML service mati.

## Task 13: Verifikasi

- [ ] `npm run build` (api + web), `npm run typecheck` (web), `npm test`, `npm run test:e2e`, `pytest`.
- [ ] Smoke API: login → overview → sales list → ml/models.
- [ ] Commit.
