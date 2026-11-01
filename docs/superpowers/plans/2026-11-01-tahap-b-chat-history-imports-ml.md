# Tahap B — History Chat, Integritas Data Chat, Impor CSV/XLSX, Kesiapan Data ML

> **For agentic workers:** execute inline, task by task, verifikasi tiap tahap.

**Goal:** Chat punya riwayat yang bisa dilanjutkan; data yang masuk lewat chat konsisten dengan kebutuhan ML (produk/pelanggan terhubung); impor penjualan CSV/XLSX dengan mapping, preview, konfirmasi, dan riwayat; halaman ML jujur soal kesiapan data toko dan tidak lagi menawarkan retraining global ke tenant.

**Spec:** `Promt.md` bagian 2, 4, 8, 9, 10.

## Global Constraints

- Tanpa Docker/Redis. Prisma v7 + MySQL Laragon.
- Tanpa mutasi DB dari chat sebelum konfirmasi eksplisit.
- Tenant isolation di semua query.
- Tidak ada klaim akurasi ML tanpa metrik nyata.
- Panel daftar chat hanya di halaman Chatbot.

## Task 1 — Skema: history chat + ImportJob

**Files:** `apps/api/prisma/schema.prisma`, migration baru.

- `ChatConversation.updatedAt DateTime @updatedAt` + index `[tenantId, updatedAt]`.
- `ChatMessage.actionId String?` (tautan ke `PendingAction`).
- `ImportJob`: `id, tenantId, userId, filename, entity, status(preview|committed|failed), mapping Json?, rows Json?, rowCount, validCount, errorCount, report Json?, createdAt, updatedAt`.
- `npx prisma migrate dev --name tahap_b_chat_history_import_jobs`; `npx prisma generate`.

## Task 2 — API history chat

**Files:** `apps/api/src/modules/chat/chat.controller.ts`, `chat.service.ts`.

- `GET /chat/conversations?limit&offset` → `{items:[{id,title,updatedAt,messageCount}],total}`.
- `GET /chat/conversations/:id` → `{conversation, messages:[{id,role,content,createdAt,action?}]}`; action dari `PendingAction` via `ChatMessage.actionId` (status + preview + expiresAt).
- `PATCH /chat/conversations/:id` judul; `DELETE /chat/conversations/:id`.
- Semua difilter `tenantId + userId`.
- Simpan `actionId` saat `createAction`.

## Task 3 — Web panel history chat

**Files:** `apps/web/app/(dashboard)/chat/page.tsx`, `apps/web/components/chat/history-panel.tsx`.

- Muat daftar percakapan; klik = muat pesan; "Percakapan baru"; hapus dengan konfirmasi.
- localStorage `chat:last:<tenantId>` → refresh memuat percakapan terakhir.
- Panel hanya di halaman chat; mobile pakai tombol buka/tutup.
- Aksi `proposed` yang belum kedaluwarsa bisa dikonfirmasi dari riwayat; yang kedaluwarsa ditandai.

## Task 4 — Integritas data lewat chat

**Files:** `apps/api/src/modules/chat/tools.ts`, `chat.service.ts`.

- Tool `createSale`/`updateSale`: tambah `customer` (nama/ref) dan item `product` (nama/SKU); backend resolusi ke ID dalam tenant. 1 cocok = pakai, >1 = balas klarifikasi, 0 = sebut tidak ditemukan (tanpa mengarang).
- Tool baru: `updateProduct`, `deleteProduct`, `updateCustomer`, `deleteCustomer` dengan preview + konfirmasi.
- Prompt: jangan mengarang produk/pelanggan.

## Task 5 — Impor CSV/XLSX

**Files:** `apps/api/src/modules/imports/*`, `apps/web/app/(dashboard)/imports/page.tsx`, `apps/api/package.json`.

- Parser: CSV (`csv-parse`) + XLSX (`exceljs`, sheet pertama). Batas 5MB, 20.000 baris, cek magic bytes.
- Entitas: `sales` (baru), `products`, `customers`.
- `POST /imports/preview` (multipart file+entity) → saran mapping + validasi per baris + simpan `ImportJob`.
- `POST /imports/:id/confirm` → commit transaksional produk/pelanggan/penjualan, update job.
- `GET /imports` riwayat; `GET /imports/:id` detail; `GET /imports/template?entity=` CSV contoh.
- Penjualan: kolom wajib tanggal, produk (nama/SKU), qty, harga; opsional ID pesanan (grouping), pelanggan, diskon, pajak. Baris tidak valid tidak masuk. Produk/pelanggan tak dikenal = error baris.
- Web: pilih entitas → unggah → mapping → preview → konfirmasi → riwayat.

## Task 6 — Kesiapan data ML per tenant

**Files:** `apps/api/src/modules/ml/ml.service.ts`, `ml.controller.ts`, `apps/web/app/(dashboard)/machine-learning/page.tsx`.

- `GET /ml/data-readiness` hitung dari DB: hari transaksi, jumlah transaksi, pelanggan, basket multi-item.
- Status `ready|limited|not_ready` + alasan + langkah perbaikan per model.
- Web: kartu kesiapan data toko; tombol latih dihapus (model global read-only).

## Task 7 — Verifikasi

- `apps/api`: build, `npm test`, `npm run test:e2e`.
- `apps/web`: `tsc --noEmit`, `next build`.
- `ml`: pytest (tidak berubah).
- Smoke: login → chat kirim → refresh → riwayat muncul → impor CSV penjualan → transaksi masuk → readiness ML.
- Commit.
