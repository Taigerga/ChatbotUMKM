# Desain: Chatbot Analitik UMKM

Tanggal: 2026-10-31
Status: menunggu persetujuan

## 1. Intent

Pemilik toko nonteknis membuka aplikasi, mendarat di chatbot, lalu mencatat penjualan atau bertanya soal performa toko dengan bahasa sehari-hari. Data yang masuk lewat chatbot/form/CSV tersimpan per tenant di MySQL. Lima model ML memberi analitik lanjutan (ramalan penjualan, segmentasi pelanggan, keranjang belanja, risiko churn, anomali), dilatih dari dataset publik 150k dan disajikan sebagai hasil yang jujur soal keterbatasannya.

Kenapa chatbot jadi halaman utama: pemilik toko tidak akan mengisi 12 field formulir tiap hari. Percakapan menurunkan biaya input; CRUD dan grafik tetap ada untuk verifikasi dan koreksi.

## 2. Goals

- Chatbot bisa mencatat penjualan/produk/pelanggan lewat usulan aksi terstruktur, dengan konfirmasi eksplisit sebelum menulis DB.
- Chatbot menjawab pertanyaan analitik dari data tenant yang sebenarnya, menyebut periode/metrik/asumsi.
- Tiga jalur input: chat, form manual, impor CSV ber-preview.
- Lima model ML dengan status kesiapan data, artefak berversi, evaluasi, dan peringatan.
- Isolasi tenant ketat di semua query, uji lintas tenant.
- Provider AI bisa diganti lewat env (Gemini ↔ OpenAI-compatible/9router) dengan fallback.

## 3. Non-goals

- Role admin/pegawai (hanya satu role: pemilik).
- Docker, Redis, message queue eksternal, microservice tambahan.
- Multi-currency/akuntansi pajak penuh; transaksi disimpan apa adanya dengan mata uang tunggal per tenant.
- Training ulang otomatis tiap transaksi baru.
- Klaim akurasi sebelum eksperimen nyata.

## 4. Anti-goals (gagal walau "jalan")

- Chatbot menulis DB tanpa konfirmasi, atau mengarang angka saat data kosong.
- Halaman ML menampilkan hasil palsu/dummy sebagai data nyata.
- Satu tenant bisa membaca data tenant lain.
- Model dilatih dengan fitur yang memuat informasi masa depan.
- Data 150k dipakai sebagai pengganti data toko tanpa label jelas.

## 5. Keputusan yang sudah disepakati

| Topik | Keputusan |
|---|---|
| Dataset 150k | Hanya bahan training model di `ml/`, bukan data tenant |
| Service ML | FastAPI internal, dipanggil NestJS via HTTP |
| Provider AI | Dua adapter: Gemini dan OpenAI-compatible (9router), primary+fallback via env |
| Churn | Tidak ada transaksi dalam 365 hari sebelum tanggal acuan; ref = 2025-12-31; 524 pelanggan 1 transaksi tidak dilabeli |
| Nama database | `toko_analitik_ai` (+ `_shadow`, `_test`, `_prod`); 0 bentrok di MySQL 8.4.3 Laragon |
| Urutan kerja | Slice chat-first (pendekatan B) |
| Stack | Next 16 App Router `app/`, NestJS 12, Prisma 7 + adapter MariaDB, MySQL 8.4.3, Tailwind 4, shadcn/ui, Recharts |
| Cakupan ML | Model dilatih sekali dari 150k → artefak `global`, dipakai semua tenant. Training per tenant disiapkan tapi terkunci sampai readiness lolos |
| Impor CSV | Produk/pelanggan tak dikenal **ditolak** per baris; ada centang "buat produk/pelanggan baru" di preview |
| Registrasi | Publik, langsung membuat Tenant + TenantMember. Tenant demo terpisah dan berlabel demo |
| Chat transport | Non-streaming JSON untuk v1; streaming menyusul bila perlu |

## 6. Pendekatan yang dipertimbangkan

| Pendekatan | Trade-off | Status |
|---|---|---|
| A. Urutan prompt (backend → ML → chat → web) | Tertib, tapi tidak ada yang bisa dipakai sampai akhir | Ditolak |
| B. Slice chat-first | Pola berisiko (usul aksi → konfirmasi) teruji lebih awal; halaman lain menyusul | **Dipilih** |
| C. ML-first | Klaim ML aman, aplikasi kosong lama, kontrak API belum teruji | Ditolak |

## 7. Arsitektur

```
Browser
 └── apps/web (Next 16, app/, RSC + client comps)
       └── apps/api (NestJS 12, /api/v1, JWT cookie, throttle, Swagger)
             ├── MySQL toko_analitik_ai (Prisma 7 + @prisma/adapter-mariadb)
             ├── AiProvider (Gemini | OpenAI-compatible)
             └── MlClient (HTTP internal, X-Internal-Token)
                   └── ml/ FastAPI :8001 (readiness, train, predict, jobs)
                         └── ml/artifacts/{tenant|global}/{model}/{version}/
```

Aturan keras: browser tidak pernah memanggil FastAPI; FastAPI tidak terbuka ke internet; format provider tidak bocor ke domain (semua lewat interface internal `ChatCompletionRequest` / `ToolCall`).

## 8. Model data (Prisma)

Semua tabel bisnis punya `tenantId` + index komposit.

- `User` (id, email unik, passwordHash, name, createdAt)
- `Tenant` (id, name, currency, timezone, createdAt)
- `TenantMember` (userId, tenantId, unique pair) — satu role, banyak toko per user; toko aktif dikirim klien sebagai `X-Tenant-Id` dan diverifikasi keanggotaannya.
- `Product` (tenantId, sku, name, category, price, cost, unique(tenantId, sku))
- `Customer` (tenantId, externalRef, name, phone/email opsional, firstSeenAt, unique(tenantId, externalRef))
- `Sale` (tenantId, customerId?, occurredAt, channel?, notes?, subtotal, discount, tax, total, status, idempotencyKey unik per tenant)
- `SaleItem` (saleId, productId?, description, qty, unitPrice, lineTotal) — produk opsional agar penjualan cepat tetap bisa dicatat.
- `ImportJob` (tenantId, filename, status, mapping Json, rowCount, validCount, errorCount, report Json, createdBy)
- `ChatConversation`, `ChatMessage` (role, content, toolCalls Json, actionId?)
- `PendingAction` (tenantId, conversationId, tool, payload Json, preview Json, status: proposed/confirmed/executed/failed/expired, expiresAt, executedAt, result Json) — satu-satunya jalan mutasi dari chat.
- `MlModel` (tenantId nullable untuk global, modelName, version, status, metrics Json, dataRange, trainedAt, artifactPath)
- `MlJob` (tenantId, modelName, type: train/predict, status, progress, error, resultRef)
- `AuditLog` (tenantId, userId, action, entity, entityId, summary Json, createdAt)
- `Session` opsional: JWT stateless + `tokenVersion` di User untuk revoke.

Konvensi: `Decimal(14,2)` untuk uang, `DateTime(3)` UTC, soft delete tidak dipakai kecuali kebutuhan muncul (hapus = hard delete + audit log).

## 9. Alur Chatbot

1. `POST /api/v1/chat/messages` (tenant dari sesi) → simpan pesan user.
2. Bangun konteks: system prompt (aturan keras), N pesan terakhir, ringkasan tenant (jumlah transaksi, rentang tanggal), definisi tool.
3. Provider dipanggil dengan structured output/tool calling. Hanya tool di whitelist.
4. Tool baca (`getSalesSummary`, `topProducts`, `customerSegments`, `forecast`, ...) dieksekusi backend → hasil dikembalikan ke model → jawaban + sitasi periode/metrik.
5. Tool tulis (`createSale`, `updateSale`, `deleteSale`, `createProduct`, `createCustomer`) → **tidak** dieksekusi. Backend memvalidasi payload (DTO) → buat `PendingAction` + preview → respons `action_proposed`.
6. UI menampilkan kartu konfirmasi (ringkasan, sumber, tanggal, nilai, dampak). User klik Setujui/Batal.
7. `POST /api/v1/chat/actions/:id/confirm` → cek tenant + status + expiry → jalankan service domain dalam transaksi DB → audit log → kembalikan hasil; status jadi `executed`/`failed`. Idempotent: konfirmasi ulang tidak menggandakan data.
8. Ambiguitas/kurang data → model wajib bertanya; backend menolak payload tanpa field wajib dan mengembalikan error yang bisa dipakai model untuk klarifikasi.

Proteksi prompt injection: konten pesan user dan isi CSV diperlakukan sebagai data; system prompt memisahkan instruksi; tool whitelist; tidak ada SQL/shell/python dari model; batas 20 tool call per pesan; timeout 30s.

## 10. Kontrak API (ringkas)

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- `GET /tenants`, `POST /tenants`, `GET /tenants/active`
- `GET /products|POST|PATCH/:id|DELETE/:id`, `GET /customers...`
- `GET /sales|POST|GET/:id|PATCH/:id|DELETE/:id` (filter tanggal, q, pagination cursor/limit)
- `GET /analytics/overview?from&to`, `/analytics/sales-trend`, `/analytics/top-products`
- `POST /chat/messages`, `GET /chat/conversations`, `GET /chat/conversations/:id`, `POST /chat/actions/:id/confirm`, `POST /chat/actions/:id/cancel`
- `POST /imports` (multipart), `GET /imports/:id`, `POST /imports/:id/confirm`, `GET /imports`
- `GET /ml/readiness`, `POST /ml/:model/train`, `GET /ml/jobs/:id`, `GET /ml/:model/latest`, `POST /ml/:model/predict`
- `GET /health` (tanpa detail sensitif)

Semua error memakai bentuk `{ statusCode, code, message, details? }`; validasi via class-validator; Swagger di `/api/docs` (non-produksi).

## 11. ML

| Model | Input minimum | Baseline | Metrik |
|---|---|---|---|
| Forecasting | tanggal + total penjualan harian | naive + moving average | MAE, RMSE, MAPE, backtest time-based |
| RFM + K-Means | customer, tanggal, nilai | k=3..8, silhouette | silhouette, profil cluster |
| Market Basket | order + item | Apriori | support, confidence, lift |
| Churn | fitur pra-jendela, label 365d | logistic regression | precision, recall, F1, PR-AUC, kalibrasi |
| Anomaly | tanggal + nilai/volume | z-score/IQR | jumlah flag, precision manual review |

Gate: `data/reports/column_suitability.md` + `.csv` disetujui sebelum preprocessing. Readiness mengembalikan `siap | siap_dengan_keterbatasan | belum_siap` + alasan + kolom kurang + langkah perbaikan. Artefak menyimpan versi, rentang data, fitur, metrik, waktu training. Training dijalankan sebagai job; tidak otomatis per transaksi.

Cakupan: artefak `global` dari dataset 150k. `POST /ml/:model/predict` memakai artefak global terhadap data tenant. Training per tenant hanya tersedia bila job readiness lolos (tidak diaktifkan di v1).

## 12. Frontend

Rute: `app/(auth)/login`, `app/(dashboard)/chat` (default redirect setelah login), `overview`, `transactions`, `products`, `customers`, `imports`, `machine-learning`, `settings`. Sidebar collapsible + header tenant aktif + status data. Empty/loading/error state wajib; tanpa data dummy.

## 13. Keamanan

JWT httpOnly, SameSite=Lax, Secure di produksi; password argon2/bcrypt; throttler per IP+user; CORS origin eksplisit; validasi upload (MIME + ukuran ≤5MB + ≤20k baris + header CSV); semua akses data melalui service ber-tenant; audit log untuk mutasi; `.env` tidak dicommit; error produksi tanpa stack trace; backup `mysqldump` terjadwal + prosedur restore di docs.

## 14. Urutan pengerjaan

1. **Fase 0 (selesai)**: audit environment, DB read-only, dataset, keputusan.
2. **Fase 1**: profiling 46 kolom × 5 file, data dictionary, matriks kecocokan, approval.
3. **Fase 2**: env + `.gitignore` + skema Prisma + DB + auth/tenant + uji isolasi.
4. **Fase 3 (slice chat)**: 1 tool tulis (createSale) end-to-end + UI chat + konfirmasi.
5. **Fase 4**: CRUD penjualan/produk/pelanggan + overview + impor CSV.
6. **Fase 5**: pipeline ML + FastAPI + halaman ML.
7. **Fase 6**: sisa tool chat (analitik + mutasi lain), QA lintas tenant, build, docs deploy.

## 15. Keputusan builder (hasil builder check)

- Chat v1 non-streaming JSON; kartu konfirmasi dikirim sebagai field `action`, bukan diselipkan di teks.
- Produk/pelanggan dirujuk lewat tool baca (`findProducts`, `findCustomers`) sebelum `createSale`; nama bebas tidak pernah ditebak backend.
- Fallback provider hanya untuk timeout / 429 / 5xx, maksimal sekali, kegagalan fallback dilaporkan ke user.
- `MlJob` sumber kebenaran tunggal di MySQL; Nest memanggil FastAPI (202 + jobId), polling, lalu update baris job.
- FastAPI membaca `data/raw/*.csv` untuk training global (tanpa kredensial DB); data tenant dikirim Nest sebagai payload JSON.
- Waktu disimpan UTC; bucket harian/mingguan memakai `timezone` tenant.
- Pagination offset untuk tabel, cursor untuk pesan chat.
- FastAPI down / artefak belum ada → tool ML tidak ditawarkan ke model; chat menjawab "model belum siap" + alasan readiness, tanpa mengarang.
- Dokumen deploy VPS disiapkan; pengujian nyata hanya di lokal Laragon.

## 16. Yang diserahkan ke builder (bebas diputuskan saat implementasi)

- Bentuk DTO dan nama field final.
- Susunan prompt sistem dan daftar tool persis.
- Struktur folder internal `ml/src`.
- Isi seed demo (dipisah jelas dari data tenant nyata).

## 17. Risiko

- Encoding dataset rusak (`Baden-WA?rttemberg`) → deteksi latin1/cp1252 saat profiling.
- Kolom leakage (`customer_lifetime_value`, `customer_order_count`, `is_repeat_customer`) → dilarang masuk fitur churn.
- TypeScript 6 di `apps/api` vs peer range Prisma 7 → verifikasi saat install; turunkan ke TS 5.x kalau perlu.
- Nest 12 + Prisma 7 ESM → `moduleFormat = "esm"`, `type: module` sudah aktif.
- MySQL 8.4 + `@prisma/adapter-mariadb` → uji koneksi sebelum migrate.
