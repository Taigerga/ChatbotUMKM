# Chatbot Analitik UMKM — Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit dataset 150k, lalu bangun fondasi (MySQL + Prisma 7 + auth + isolasi tenant) dan slice chatbot yang bisa mencatat satu penjualan lewat usulan aksi + konfirmasi.

**Architecture:** Monorepo turbo yang sudah ada. NestJS 12 (`apps/api`) jadi satu-satunya pintu API `/api/v1`, Prisma 7 + `@prisma/adapter-mariadb` ke MySQL Laragon. Next 16 (`apps/web`, App Router `app/`) memanggil API lewat cookie httpOnly. Chat memakai provider adapter (Gemini / OpenAI-compatible) dan hanya boleh mengusulkan aksi; mutasi terjadi di `POST /chat/actions/:id/confirm`.

**Tech Stack:** Node 26, npm workspaces, Next 16.4.3, React 19.3.1, Tailwind 4, shadcn (`@workspace/ui`), NestJS 12, Prisma 7, MySQL 8.4.3, Python 3.13 + pandas, vitest, pytest.

**Spec:** `docs/superpowers/specs/2026-10-31-toko-analitik-ai-design.md`

## Global Constraints

- Jangan pakai Docker, Redis, `src/app/`, TypeORM/Sequelize/Drizzle, Prisma v6 (`prisma-client-js`, tanpa adapter, tanpa `prisma.config.ts`), atau Prisma v8.
- Frontend `apps/web`, backend `apps/api`, Python `ml/` (di luar `apps/`).
- Database hanya `toko_analitik_ai` (+ `_shadow`, `_test`, `_prod`). Jangan sentuh database lain. Jangan jalankan `migrate reset` / `db push --force-reset`.
- `root` tanpa password hanya untuk lokal.
- Model AI tidak boleh mengeksekusi SQL/shell/Python; hanya tool whitelist.
- Tidak ada mutasi DB dari chat sebelum konfirmasi eksplisit.
- Uang: `Decimal(14,2)`. Waktu: UTC (`DateTime(3)`), bucket harian pakai `timezone` tenant.
- Satu role aplikasi; semua query difilter `tenantId` dari sesi, bukan dari body.
- Rahasia hanya di `.env`; `.env.example` tanpa nilai rahasia.
- Bahasa UI: Indonesia.

## Review Focus

1. Akses lintas tenant dengan ID valid tenant lain → harus 404, bukan 200 atau 403 yang membocorkan keberadaan data.
2. Konfirmasi aksi yang sama dua kali / dua tab → tetap satu `Sale`, tanpa duplikat.
3. Angka ambigu dari chat ("1,25jt", "1.250.000", "18 item") → klarifikasi, bukan tebakan.
4. Provider timeout/429/5xx → fallback sekali, dan chat tetap menjawab tanpa mutasi.
5. Transaksi dekat tengah malam dengan `timezone` tenant berbeda → masuk bucket tanggal yang benar.

---

## File Structure (Milestone 1)

```
apps/api/
  prisma/schema.prisma              model + index
  prisma/seed.ts                    user demo + tenant demo
  prisma.config.ts                  CLI config, dotenv, shadow url
  src/generated/prisma/             hasil generate (gitignored)
  src/config/env.ts                 validasi env
  src/prisma/prisma.module.ts|service.ts
  src/common/                       filter, pipe, decorator, guard
  src/modules/auth/                 controller, service, dto, cookie
  src/modules/tenants/              tenant context + switcher
  src/modules/sales/                service + dto (dipakai chat tool)
  src/modules/ai-provider/          interface, gemini, openai-compatible, fallback
  src/modules/chat/                 controller, service, tools, pending actions
  src/modules/health/               health controller
  test/*.e2e-spec.ts                isolasi tenant, chat, idempotency

apps/web/
  app/(auth)/login/page.tsx
  app/(dashboard)/layout.tsx
  app/(dashboard)/chat/page.tsx
  lib/api.ts                        fetch wrapper + cookie + X-Tenant-Id
  components/layout/*, components/chat/*

ml/
  .venv/                            gitignored
  requirements.txt
  src/profiling/profile_datasets.py
  src/profiling/column_suitability.py
  tests/test_profiling.py
data/reports/profiling.md, data_dictionary.csv, column_suitability.md/.csv
```

---

### Task 1: Repo hygiene & env skeleton

**Files:**
- Modify: `.gitignore`
- Create: `apps/api/.env.example`, `apps/web/.env.example`, `ml/.env.example`
- Test: `apps/api/test/hygiene.spec.ts` (vitest, baca file, bukan unit logic)

**Interfaces:**
- Produces: nama variabel env yang dipakai semua task berikut.

- [ ] **Step 1: Tulis tes yang gagal** — `apps/api/test/hygiene.spec.ts`

```ts
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("gitignore menutup data & artefak", () => {
  const g = readFileSync("../../.gitignore", "utf8");
  for (const p of ["data/raw", "data/interim", "data/processed", "ml/artifacts", "ml/.venv", "apps/api/src/generated/", ".env"])
    expect(g).toContain(p);
});

test(".env.example api memuat variabel wajib tanpa nilai rahasia", () => {
  const e = readFileSync(".env.example", "utf8");
  for (const k of ["DATABASE_URL", "SHADOW_DATABASE_URL", "JWT_SECRET", "AI_PRIMARY", "AI_FALLBACK",
                   "GEMINI_API_KEY", "OPENAI_COMPAT_BASE_URL", "OPENAI_COMPAT_API_KEY", "WEB_ORIGIN", "PORT"])
    expect(e).toContain(`${k}=`);
});
```

- [ ] **Step 2: Jalankan, pastikan gagal** — `cd apps/api; npx vitest run test/hygiene.spec.ts` → FAIL (ENOENT `.env.example`).

- [ ] **Step 3: Implementasi** — tambahkan ke `.gitignore`: `data/raw/`, `data/interim/`, `data/processed/`, `data/reports/` (kecuali `README.md`), `ml/artifacts/`, `ml/.venv/`, `apps/api/src/generated/`, `apps/api/prisma/migrations/**/migration_lock.toml` tidak diabaikan. Isi `.env.example`:

```env
# apps/api
DATABASE_URL="mysql://root:@localhost:3306/toko_analitik_ai"
SHADOW_DATABASE_URL="mysql://root:@localhost:3306/toko_analitik_ai_shadow"
TEST_DATABASE_URL="mysql://root:@localhost:3306/toko_analitik_ai_test"
PORT=3001
WEB_ORIGIN=http://localhost:3000
JWT_SECRET=ganti-di-lokal
AUTH_COOKIE_NAME=token
AI_PRIMARY=gemini
AI_FALLBACK=openai-compatible
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
OPENAI_COMPAT_BASE_URL=http://localhost:20128/v1
OPENAI_COMPAT_API_KEY=
OPENAI_COMPAT_MODEL=
ML_SERVICE_URL=http://127.0.0.1:8001
ML_INTERNAL_TOKEN=ganti-di-lokal
```

`.env` asli dibuat dari contoh ini (tidak dicommit). `apps/web/.env.example`: `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1`. `ml/.env.example`: `DATA_DIR=../data`, `ARTIFACT_DIR=./artifacts`, `LOG_LEVEL=INFO`.

- [ ] **Step 4: Tes lulus** — `cd apps/api; npx vitest run test/hygiene.spec.ts` → PASS.

- [ ] **Step 5: Commit** — `git add .gitignore apps/api/.env.example apps/web/.env.example ml/.env.example apps/api/test/hygiene.spec.ts && git commit -m "chore: gitignore data/artefak + env example"`

---

### Task 2: Profiling dataset (Fase 1)

**Files:**
- Create: `ml/requirements.txt`, `ml/src/profiling/profile_datasets.py`, `ml/tests/test_profiling.py`
- Output: `data/reports/profiling.md`, `data/reports/data_dictionary.csv`

**Interfaces:**
- Produces: `profile_dataset(csv_path: Path) -> pandas.DataFrame` (satu baris per kolom: `file, column, dtype, non_null, nullable_pct, unique, min, max, sample, suspected_role`) dan `write_reports(data_dir: Path, out_dir: Path) -> None`.

- [ ] **Step 1: Venv + dependency** — `cd ml; py -3.13 -m venv .venv; .venv\Scripts\python -m pip install -U pip; .venv\Scripts\pip install pandas==2.3.3 pytest==8.4.2` lalu tulis `requirements.txt` dengan versi terpasang (`pandas==2.3.3`, `pytest==8.4.2`). Tambahkan `ml/pytest.ini` berisi `[pytest]` + `pythonpath = .` agar `from src...` bisa diimpor.

- [ ] **Step 2: Tulis tes gagal** — `ml/tests/test_profiling.py`

```python
from pathlib import Path
import pandas as pd
from src.profiling.profile_datasets import profile_dataset, write_reports

RAW = Path(__file__).resolve().parents[2] / "data" / "raw"

def test_profile_order_level_file():
    df = profile_dataset(RAW / "ecommerce_sales_customer_analytics_150k.csv")
    assert len(df) == 46
    assert df.loc[df.column == "order_id", "unique"].item() == 138116
    assert df.loc[df.column == "order_date", "nullable_pct"].item() == 0

def test_write_reports(tmp_path):
    write_reports(RAW, tmp_path)
    assert (tmp_path / "profiling.md").exists()
    dd = pd.read_csv(tmp_path / "data_dictionary.csv")
    assert set(dd.file.unique()) == {"customer_master", "dataset_statistics",
        "ecommerce_sales_customer_analytics_150k", "order_items", "product_catalog"}
```

- [ ] **Step 3: Jalankan, pastikan gagal** — `cd ml; .venv\Scripts\python -m pytest tests/test_profiling.py -q` → FAIL `ModuleNotFoundError`.

- [ ] **Step 4: Implementasi** `profile_dataset`: baca dengan `pd.read_csv(path, encoding="utf-8", encoding_errors="replace", low_memory=False)`, hitung per kolom `dtype, non_null, nullable_pct, unique, min, max, sample` (3 nilai unik acak, `random_state=0`), isi `suspected_role` dengan aturan nama: `*_id$` → `id`, `*date*` → `tanggal`, nama berisi `sales|revenue|price|cost|profit|amount|value` → `nilai_uang`, `quantity` → `kuantitas`, sisanya `atribut`. `write_reports` menulis `profiling.md` (tabel per file: baris, kolom, null tertinggi, peringatan encoding `errors="replace"` bila ada `\ufffd`) dan `data_dictionary.csv` (gabungan semua file).

- [ ] **Step 5: Tes lulus** — `cd ml; .venv\Scripts\python -m pytest tests/test_profiling.py -q` → `2 passed`.

- [ ] **Step 6: Generate laporan nyata** — `cd ml; .venv\Scripts\python -m src.profiling.profile_datasets` → cek `data/reports/profiling.md` memuat 5 file, 138.116 baris untuk file order, dan menandai `Baden-WA?rttemberg` sebagai peringatan encoding.

- [ ] **Step 7: Commit** — `git add ml/requirements.txt ml/src/profiling ml/tests data/reports/profiling.md data/reports/data_dictionary.csv && git commit -m "feat(ml): profiling 5 dataset + data dictionary"`

---

### Task 3: Matriks kecocokan kolom × model (gerbang persetujuan)

**Files:**
- Create: `ml/src/profiling/column_suitability.py`, `data/reports/column_suitability.csv`, `data/reports/column_suitability.md`
- Test: `ml/tests/test_column_suitability.py`

**Interfaces:**
- Consumes: `profile_dataset`, `write_reports` (Task 2).
- Produces: `build_matrix(data_dir: Path) -> pd.DataFrame` dengan kolom `file, column, forecasting, rfm_kmeans, market_basket, churn, anomaly, reason`; status per sel ∈ {`dipakai`, `opsional`, `tidak_dipakai`, `berisiko_leakage`}.

- [ ] **Step 1: Tulis tes gagal**

```python
def test_matrix_marks_leakage_and_required_columns():
    m = build_matrix(RAW)
    cell = m[(m.file == "ecommerce_sales_customer_analytics_150k") & (m.column == "customer_lifetime_value")]
    assert (cell.churn == "berisiko_leakage").all()
    assert (m[(m.file == "order_items") & (m.column == "product_id")].market_basket == "dipakai").all()
    assert m[(m.file == "dataset_statistics")].forecasting.eq("tidak_dipakai").all()
```

- [ ] **Step 2: Jalankan, gagal** — `pytest tests/test_column_suitability.py -q` → FAIL.

- [ ] **Step 3: Implementasi** — aturan eksplisit per (file, kolom): `customer_lifetime_value`, `customer_order_count`, `is_repeat_customer` → semua model `berisiko_leakage`; `order_id, customer_id, order_date, net_sales` → `dipakai` untuk forecasting/RFM/churn/anomaly sesuai model; `order_items.order_id, product_id` → market_basket `dipakai`; kolom deskriptif (`customer_review`, `campaign_name`, `warehouse`, `coupon_code`) → `tidak_dipakai`; file `dataset_statistics` seluruhnya `tidak_dipakai` dengan alasan "ringkasan agregat, bukan observasi". Tulis `.csv` + `.md` (tabel + ringkasan keputusan per file: dipakai penuh / sebagian / referensi / tidak dipakai).

- [ ] **Step 4: Tes lulus** — `pytest tests/test_column_suitability.py -q` → PASS. Lalu jalankan generator.

- [ ] **Step 5: GERBANG — berhenti dan minta persetujuan user** atas `data/reports/column_suitability.md` (file/kolom yang dipakai dan tidak). Jangan lanjut ke Task 12 (preprocessing/training) tanpa persetujuan. Task 4-11 boleh jalan paralel karena tidak memakai dataset.

- [ ] **Step 6: Commit** — `git add ml/src/profiling/column_suitability.py ml/tests data/reports/column_suitability.* && git commit -m "feat(ml): matriks kecocokan kolom x model"`

---

### Task 4: Prisma 7 + koneksi MySQL

**Files:**
- Create: `apps/api/prisma.config.ts`, `apps/api/prisma/schema.prisma`, `apps/api/src/prisma/prisma.service.ts`, `apps/api/src/prisma/prisma.module.ts`, `apps/api/prisma/smoke.ts`
- Modify: `apps/api/package.json`, `apps/api/tsconfig.json`

**Interfaces:**
- Produces: `PrismaService extends PrismaClient` (adapter `PrismaMariaDb`, ctor dari `DATABASE_URL`), `PrismaModule` global. Import client: `import { PrismaClient } from "../generated/prisma/client"`.

- [ ] **Step 1: Pasang dependency** — `cd apps/api; npm i @prisma/client@7 @prisma/adapter-mariadb mariadb dotenv; npm i -D prisma@7`. Jika peer conflict dengan `typescript@6`, turunkan `typescript` ke `~5.9` dan catat di commit message.

- [ ] **Step 2: Tulis tes gagal** — `apps/api/prisma/smoke.ts`

```ts
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const rows = await prisma.$queryRaw<{ db: string }[]>`SELECT DATABASE() AS db`;
console.log("connected", rows[0].db, "tenants", await prisma.tenant.count());
```

- [ ] **Step 3: Jalankan, gagal** — `npx tsx prisma/smoke.ts` → FAIL (client belum ada). (Pasang `tsx` sebagai devDependency.)

- [ ] **Step 4: Implementasi config + schema**

`prisma.config.ts`:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: env("DATABASE_URL"), shadowDatabaseUrl: env("SHADOW_DATABASE_URL") },
});
```

`schema.prisma` (generator + datasource tanpa `url`):

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "esm"
}

datasource db { provider = "mysql" }

model User { id String @id @default(cuid()) email String @unique passwordHash String name String tokenVersion Int @default(0) createdAt DateTime @default(now()) memberships TenantMember[] }
model Tenant { id String @id @default(cuid()) name String currency String @default("IDR") timezone String @default("Asia/Jakarta") createdAt DateTime @default(now()) members TenantMember[] }
model TenantMember { id String @id @default(cuid()) userId String tenantId String user User @relation(fields: [userId], references: [id]) tenant Tenant @relation(fields: [tenantId], references: [id]) @@unique([userId, tenantId]) @@index([tenantId]) }
model Customer { id String @id @default(cuid()) tenantId String externalRef String name String phone String? email String? createdAt DateTime @default(now()) @@unique([tenantId, externalRef]) @@index([tenantId]) }
model Product { id String @id @default(cuid()) tenantId String sku String name String category String? price Decimal @db.Decimal(14,2) cost Decimal? @db.Decimal(14,2) createdAt DateTime @default(now()) @@unique([tenantId, sku]) @@index([tenantId]) }
model Sale { id String @id @default(cuid()) tenantId String customerId String? occurredAt DateTime @db.DateTime(3) notes String? subtotal Decimal @db.Decimal(14,2) discount Decimal @default(0) @db.Decimal(14,2) tax Decimal @default(0) @db.Decimal(14,2) total Decimal @db.Decimal(14,2) source String @default("manual") idempotencyKey String? createdAt DateTime @default(now()) items SaleItem[] @@unique([tenantId, idempotencyKey]) @@index([tenantId, occurredAt]) }
model SaleItem { id String @id @default(cuid()) saleId String productId String? description String qty Int unitPrice Decimal @db.Decimal(14,2) lineTotal Decimal @db.Decimal(14,2) sale Sale @relation(fields: [saleId], references: [id], onDelete: Cascade) @@index([saleId]) }
model ChatConversation { id String @id @default(cuid()) tenantId String userId String title String? createdAt DateTime @default(now()) messages ChatMessage[] @@index([tenantId, createdAt]) }
model ChatMessage { id String @id @default(cuid()) conversationId String role String content String toolName String? toolResult Json? createdAt DateTime @default(now()) conversation ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade) @@index([conversationId, createdAt]) }
model PendingAction { id String @id @default(cuid()) tenantId String conversationId String tool String payload Json preview Json status String @default("proposed") expiresAt DateTime executedAt DateTime? result Json? idempotencyKey String @unique createdAt DateTime @default(now()) @@index([tenantId, status]) }
model AuditLog { id String @id @default(cuid()) tenantId String userId String action String entity String entityId String summary Json createdAt DateTime @default(now()) @@index([tenantId, createdAt]) }
model MlModel { id String @id @default(cuid()) tenantId String? modelName String version String status String metrics Json? dataRange String? trainedAt DateTime? artifactPath String @@unique([tenantId, modelName, version]) }
model MlJob { id String @id @default(cuid()) tenantId String? modelName String type String status String @default("queued") progress Int @default(0) remoteJobId String? error String? result Json? createdAt DateTime @default(now()) @@index([tenantId, status]) }
```

`prisma.service.ts`: baca `process.env.DATABASE_URL`, buat `new PrismaMariaDb(url)` dalam `onModuleInit`, `$connect()`; `PrismaModule` `@Global()`.

- [ ] **Step 5: Generate + migrate** — buat database (Task 5 Step 1 dulu bila belum), lalu `npx prisma generate` dan `npx prisma migrate dev --name init`. Jangan reset.

- [ ] **Step 6: Uji koneksi** — `npx tsx prisma/smoke.ts` → `connected toko_analitik_ai tenants 0`.

- [ ] **Step 7: Commit** — `git add apps/api/prisma apps/api/src/prisma apps/api/package.json apps/api/tsconfig.json && git commit -m "feat(api): prisma 7 mariadb adapter + skema inti"`

---

### Task 5: Database + seed

**Files:**
- Create: `apps/api/prisma/seed.ts`
- Test: `apps/api/test/seed.e2e-spec.ts`

**Interfaces:**
- Produces: user demo `demo@toko.local` / `demo12345`, tenant "Toko Demo" (ditandai `isDemo` lewat nama), 3 produk, 2 pelanggan, 5 penjualan (@ total `250000.00`, jumlah seluruhnya `1250000.00`). Semua baris seed memakai `idempotencyKey`/`sku` unik agar seed bisa dijalankan ulang.

- [ ] **Step 1: Buat database (hanya jika belum ada)** — cek `SELECT schema_name FROM information_schema.schemata WHERE schema_name IN (...)`; jika kosong jalankan `CREATE DATABASE toko_analitik_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;` dan sama untuk `toko_analitik_ai_shadow`, `toko_analitik_ai_test`. Tanpa `IF NOT EXISTS`, tanpa `DROP`.

- [ ] **Step 2: Tulis tes gagal** — jalankan seed dua kali, lalu: `prisma.user.count({where:{email:"demo@toko.local"}})` = 1, `prisma.sale.count()` = 5, dan total `Sale.total` = `1250000.00`.

- [ ] **Step 3: Jalankan, gagal** — `npx vitest run test/seed.e2e-spec.ts` → FAIL (seed belum ada).

- [ ] **Step 4: Implementasi `seed.ts`** — `upsert` user (argon2 hash), tenant, membership, produk (`SKU-001..003`), pelanggan (`CUST-001..002`), 5 `Sale` + item dengan `idempotencyKey: "seed-1".."seed-5"`.

- [ ] **Step 5: Tes lulus** — `npx prisma db seed; npx prisma db seed; npx vitest run test/seed.e2e-spec.ts` → PASS, hitungan tidak bertambah.

- [ ] **Step 6: Commit** — `git add apps/api/prisma/seed.ts apps/api/test/seed.e2e-spec.ts && git commit -m "feat(api): seed idempotent toko demo"`

---

### Task 6: Bootstrap Nest (env, error, swagger, health)

**Files:**
- Create: `apps/api/src/config/env.ts`, `apps/api/src/common/http-exception.filter.ts`, `apps/api/src/modules/health/health.controller.ts|module.ts`
- Modify: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
- Test: `apps/api/test/health.e2e-spec.ts`

**Interfaces:**
- Produces: `validateEnv()` mengembalikan objek bertipe `Env` (semua kunci `.env.example` Task 1); semua error berbentuk `{ statusCode, code, message, details? }`; `GET /api/v1/health` → `{ status: "ok", db: "up" }`; Swagger di `/api/docs` hanya bila `NODE_ENV !== "production"`.

- [ ] **Step 1: Tulis tes gagal**

```ts
test("health 200 dan tidak membocorkan koneksi", async () => {
  const res = await request(app.getHttpServer()).get("/api/v1/health").expect(200);
  expect(res.body).toEqual({ status: "ok", db: "up" });
  expect(JSON.stringify(res.body)).not.toMatch(/password|mysql:\/\//i);
});
```

- [ ] **Step 2: Gagal** — `npx vitest run --config vitest.config.e2e.ts test/health.e2e-spec.ts` → 404.

- [ ] **Step 3: Implementasi** — `main.ts`: prefix `api/v1`, `cookieParser()`, CORS `origin: env.WEB_ORIGIN, credentials: true`, `ValidationPipe({whitelist:true, transform:true})`, global filter, Swagger. `env.ts` memvalidasi kunci wajib dan melempar error saat startup bila kosong (tanpa mencetak nilai). Health cek `prisma.$queryRaw\`SELECT 1\``. Samakan `vitest.config.e2e.ts` dengan `TEST_DATABASE_URL` dan `beforeAll` yang menghapus isi tabel (`deleteMany` berurutan, bukan `migrate reset`).

- [ ] **Step 4: Lulus** — perintah Step 2 → PASS.

- [ ] **Step 5: Commit** — `git add apps/api/src && git commit -m "feat(api): bootstrap config, error shape, health, swagger"`

---

### Task 7: Auth (register/login/logout/me)

**Files:**
- Create: `apps/api/src/modules/auth/{auth.module.ts,auth.controller.ts,auth.service.ts,dto/*.ts}`, `apps/api/src/common/current-user.decorator.ts`, `apps/api/src/common/jwt-auth.guard.ts`
- Test: `apps/api/test/auth.e2e-spec.ts`

**Interfaces:**
- Produces: `POST /api/v1/auth/register {email,password,name,storeName}` → set cookie `token`, body `{user:{id,email,name}, tenants:[{id,name}], activeTenantId}`; `POST /auth/login {email,password}`; `POST /auth/logout`; `GET /auth/me`. `JwtAuthGuard` menaruh `req.auth = { userId, tenantIds: string[], tokenVersion }`; `@CurrentUser()` mengembalikan objek itu.

- [ ] **Step 1: Tulis tes gagal**

```ts
test("register membuat tenant + membership + cookie httpOnly", async () => {
  const res = await request(app.getHttpServer()).post("/api/v1/auth/register")
    .send({ email: "a@b.c", password: "rahasia123", name: "A", storeName: "Toko A" }).expect(201);
  expect(res.body.tenants).toHaveLength(1);
  expect(res.headers["set-cookie"][0]).toMatch(/HttpOnly/i);
});
test("login password salah 401 dan pesan generik", async () => {
  const res = await request(app.getHttpServer()).post("/api/v1/auth/login")
    .send({ email: "a@b.c", password: "salah" }).expect(401);
  expect(res.body.message).toBe("Email atau password salah");
});
```

- [ ] **Step 2: Gagal** — `npx vitest run --config vitest.config.e2e.ts test/auth.e2e-spec.ts` → 404.

- [ ] **Step 3: Implementasi** — argon2id hash; JWT HS256 `{sub, tv}` exp 7d, `SameSite=Lax`, `Secure` bila `NODE_ENV=production`; DTO `@IsEmail`, `@MinLength(8)`; register dalam satu `prisma.$transaction` membuat Tenant + TenantMember; password tidak pernah dikembalikan.

- [ ] **Step 4: Lulus** — perintah Step 2 → PASS.

- [ ] **Step 5: Commit** — `git add apps/api/src apps/api/test/auth.e2e-spec.ts && git commit -m "feat(api): auth cookie jwt + tenant bootstrap"`

---

### Task 8: Tenant context & isolasi

**Files:**
- Create: `apps/api/src/common/tenant.guard.ts`, `apps/api/src/modules/tenants/{tenants.module.ts,tenants.controller.ts,tenants.service.ts}`
- Test: `apps/api/test/tenant-isolation.e2e-spec.ts`

**Interfaces:**
- Produces: `TenantGuard` membaca header `X-Tenant-Id`, memverifikasi keanggotaan (`TenantMember`), menolak 403 `TENANT_FORBIDDEN` bila bukan anggota, 400 `TENANT_REQUIRED` bila header absen; `req.tenantId` diisi. `GET /api/v1/tenants` → daftar toko milik user; `GET /api/v1/tenants/active` → detail tenant aktif.

- [ ] **Step 1: Tulis tes gagal** — user A dan B masing-masing punya tenant; A meminta `X-Tenant-Id` milik B pada `GET /tenants/active` → 403 `TENANT_FORBIDDEN`; tanpa header → 400 `TENANT_REQUIRED`; `GET /tenants` A hanya berisi tenant A.

- [ ] **Step 2: Gagal** — `npx vitest run --config vitest.config.e2e.ts test/tenant-isolation.e2e-spec.ts` → FAIL.

- [ ] **Step 3: Implementasi** — guard global setelah `JwtAuthGuard`; `TenantService.listForUser(userId)`, `getActive(userId, tenantId)`; tidak ada query tanpa `tenantId`.

- [ ] **Step 4: Lulus** — PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat(api): tenant guard + isolasi"`

---

### Task 9: Sales service (create + list) untuk tool chat

**Files:**
- Create: `apps/api/src/modules/sales/{sales.module.ts,sales.service.ts,sales.controller.ts,dto/create-sale.dto.ts}`, `apps/api/src/modules/sales/sale-calculator.ts`
- Test: `apps/api/test/sales.e2e-spec.ts`

**Interfaces:**
- Produces: `SalesService.create(tenantId, userId, dto, opts:{idempotencyKey?:string, source:string}) : Promise<Sale>`; `SalesService.list(tenantId, {from,to,limit,offset})`; `SalesService.validate(dto) : string[]` (daftar pesan error bisnis, array kosong = valid; dipakai chat Task 11). `create-sale.dto.ts`: `{ occurredAt: string(ISO), customerId?: string, notes?: string, discount?: number, tax?: number, items: {productId?: string, description: string, qty: number, unitPrice: number}[] }`.
- `sale-calculator.ts`: `calculateTotals(items, discount, tax) -> {subtotal, total}` (Decimal, dibulatkan 2 desimal; `total = subtotal - discount + tax`).

- [ ] **Step 1: Tulis tes gagal** — `POST /sales` dengan 2 item (2×250000, 1×750000), discount 0 → `subtotal 1250000.00`, `total 1250000.00`; `POST` dengan `idempotencyKey` sama dua kali → satu baris; `GET /sales?from&to` hanya mengembalikan milik tenant aktif.

- [ ] **Step 2: Gagal** — FAIL 404.

- [ ] **Step 3: Implementasi** — create dalam `$transaction` (Sale + items, hitung total di server, abaikan total dari klien); `idempotencyKey` diisi dari header `Idempotency-Key` bila ada; tulis `AuditLog` action `sale.created`.

- [ ] **Step 4: Lulus** — PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat(api): sales service + kalkulasi total server-side"`

---

### Task 10: AI provider adapter + fallback

**Files:**
- Create: `apps/api/src/modules/ai-provider/{ai-provider.module.ts,ai-provider.service.ts,provider.interface.ts,gemini.provider.ts,openai-compatible.provider.ts,fallback.ts}`
- Test: `apps/api/test/ai-provider.spec.ts` (unit, `fetch` di-mock)

**Interfaces:**
- Produces: `interface AiProvider { name: string; complete(req: CompletionRequest): Promise<CompletionResult> }`; `CompletionRequest = { system: string; messages: {role:"user"|"assistant";content:string}[]; tools: ToolSpec[] }`; `CompletionResult = { provider: string; text?: string; toolCalls: {id:string; name:string; arguments: Record<string,unknown>}[] }`; `AiProviderService.complete(req)` memakai primary lalu fallback pada error `TIMEOUT|RATE_LIMIT|SERVER_ERROR`, sekali, dan mengisi `provider` dengan nama adapter yang menjawab.

- [ ] **Step 1: Tulis tes gagal** — primary mock melempar 429 → hasil dari fallback dan `result.provider === "fallback"`; primary melempar error 400 (mis. invalid request) → tidak fallback, error dilempar.

- [ ] **Step 2: Gagal** — FAIL module not found.

- [ ] **Step 3: Implementasi** — Gemini: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` dengan `tools.functionDeclarations`; OpenAI-compatible: `POST {base}/chat/completions` dengan `tools` format `function`; timeout 25s via `AbortSignal.timeout`; mapping error 429 → `RATE_LIMIT`, 5xx → `SERVER_ERROR`, abort → `TIMEOUT`. Jangan log isi pesan atau API key.

- [ ] **Step 4: Lulus** — `npx vitest run test/ai-provider.spec.ts` → PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat(api): ai provider adapter + fallback terbatas"`

---

### Task 11: Chat usul aksi (tanpa mutasi)

**Files:**
- Create: `apps/api/src/modules/chat/{chat.module.ts,chat.controller.ts,chat.service.ts,tools.ts,prompt.ts}`, `apps/api/src/modules/chat/dto/send-message.dto.ts`
- Test: `apps/api/test/chat-propose.e2e-spec.ts`

**Interfaces:**
- Consumes: `AiProviderService.complete` (Task 10), `SalesService` (Task 9), `PendingAction`.
- Produces: `POST /api/v1/chat/messages {conversationId?, message}` → `{ conversationId, reply: string, action?: { id, tool: "createSale", preview: {...}, expiresAt } }`. `ToolsService.runRead(name, args, tenantId)` untuk `getSalesSummary` dan `findProducts`. `createSale` tidak dieksekusi: hanya `PendingAction` status `proposed`, payload tervalidasi `CreateSaleDto` + `SalesService.validate`.

- [ ] **Step 1: Tulis tes gagal** — pesan "Catat penjualan 27 Oktober 2026 sebesar Rp1.250.000 dari 18 item" dengan provider mock mengembalikan tool call `createSale` → respons memuat `action.tool === "createSale"`, `prisma.sale.count()` tidak berubah, preview memuat `total: "1250000.00"`, dan `action.id` ada. Pesan tanpa tool call → `reply` saja, tanpa `action`.

- [ ] **Step 2: Gagal** — FAIL 404.

- [ ] **Step 3: Implementasi** — `prompt.ts` berisi system prompt (aturan: jangan mengarang; tanya bila ambigu; jangan klaim ML jalan; hanya tool whitelist; output tool call saja). `chat.service` menyimpan pesan user + asisten, menjalankan maksimal 5 read-tool lalu satu write-tool, memvalidasi argumen dengan `class-validator` (`plainToInstance` + `validate`), menyimpan payload + preview, `expiresAt = now + 15 menit`. Argument invalid → `reply` klarifikasi, tanpa `PendingAction`.

- [ ] **Step 4: Lulus** — PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat(api): chat usul aksi createSale + preview"`

---

### Task 12: Konfirmasi aksi (idempoten) + audit

**Files:**
- Modify: `apps/api/src/modules/chat/chat.controller.ts`, `chat.service.ts`
- Test: `apps/api/test/chat-confirm.e2e-spec.ts`

**Interfaces:**
- Produces: `POST /api/v1/chat/actions/:id/confirm` → `{ status:"executed", result:{saleId, total} }`; `POST /chat/actions/:id/cancel` → `{ status:"cancelled" }`. Aksi milik tenant lain → 404. Aksi kedaluwarsa → 409 `ACTION_EXPIRED`; aksi yang sudah dibatalkan → 409 `ACTION_CANCELLED`. Konfirmasi kedua → 200 dengan hasil sama, tanpa `Sale` baru.

- [ ] **Step 1: Tulis tes gagal** — propose → confirm → `sale.count()` +1 dan `response.result.total === "1250000.00"`; confirm lagi → count tetap +1, body sama; tenant B confirm ID A → 404; cancel lalu confirm → 409.

- [ ] **Step 2: Gagal** — FAIL.

- [ ] **Step 3: Implementasi** — `confirm` memakai `prisma.$transaction`: baca `PendingAction` dengan `where {id, tenantId}` + `status: "proposed"`, ubah ke `confirmed`, jalankan `SalesService.create` dengan `idempotencyKey = pendingAction.id`, set `executed` + `result`, tulis `AuditLog` `sale.created` dengan `source: "chat"`. Bila `status === "executed"` kembalikan `result` lama (idempoten).

- [ ] **Step 4: Lulus** — PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat(api): konfirmasi aksi idempoten + audit"`

---

### Task 13: Web auth + layout + redirect ke chat

**Files:**
- Create: `apps/web/lib/api.ts`, `apps/web/app/(auth)/login/page.tsx`, `apps/web/app/(dashboard)/layout.tsx`, `apps/web/components/layout/sidebar.tsx`, `apps/web/components/layout/header.tsx`, `apps/web/app/page.tsx` (redirect)
- Test: manual (Playwright menyusul di Milestone 2) + `npm run typecheck`

**Interfaces:**
- Consumes: API Task 6-8.
- Produces: `apiFetch<T>(path, init?)` yang selalu mengirim `credentials:"include"`, `X-Tenant-Id` dari `localStorage.tenantId`, melempar `ApiError {status, code, message}`. Rute `/` → `/chat` bila sesi valid, `/login` bila tidak.

- [ ] **Step 1: Tulis tes gagal** — `apps/web/lib/api.ts` belum ada. Tulis `apps/web/lib/api.test-d.ts` (type-only) atau cukup buat `app/(dashboard)/chat/page.tsx` yang mengimpor `apiFetch` lebih dulu; `npm run typecheck` harus gagal dengan `Cannot find module '@/lib/api'` sebelum file dibuat.
- [ ] **Step 2: Implementasi** — form login/register (label Indonesia, error spesifik), simpan `activeTenantId`, layout dashboard dengan sidebar (Chat, Ringkasan, Transaksi, Produk, Pelanggan, Impor, Machine Learning, Pengaturan) yang halaman non-M1 dinonaktifkan dengan teks "belum tersedia"; chat sebagai item aktif default.
- [ ] **Step 3: Verifikasi** — `npm run typecheck; npm run build` di `apps/web` → sukses; buka `/` → redirect `/login`.
- [ ] **Step 4: Commit** — `git commit -am "feat(web): auth + layout dashboard + redirect chat"`

---

### Task 14: Web chat + kartu konfirmasi

**Files:**
- Create: `apps/web/app/(dashboard)/chat/page.tsx`, `apps/web/components/chat/{message-list.tsx,composer.tsx,action-card.tsx,empty-state.tsx}`
- Test: manual + typecheck

**Interfaces:**
- Consumes: `POST /chat/messages`, `POST /chat/actions/:id/confirm|cancel`, `apiFetch`.
- Produces: UI pesan (user/assistant), `ActionCard` menampilkan ringkasan (tanggal, total, jumlah item, sumber "via chat") + tombol **Setujui** / **Batal**, state `menunggu|diproses|berhasil|gagal`, toast hasil, dan tombol ulangi saat gagal.

- [ ] **Step 1: Implementasi** — kirim pesan (Enter), tampilkan loading "Menyiapkan…", render `action` sebagai kartu, disable tombol setelah diklik, tampilkan total terformat Rupiah dari string server (jangan hitung ulang di klien).
- [ ] **Step 2: Verifikasi manual** — login demo → kirim pesan penjualan → kartu muncul → Setujui → toast "Penjualan tercatat" → konfirmasi ulang tidak menggandakan (cek `GET /sales`).
- [ ] **Step 3: Verifikasi otomatis** — `npm run typecheck && npm run build` → sukses; `export const dynamic` tidak dipakai untuk memaksa cache (default Next 16).
- [ ] **Step 4: Commit** — `git commit -am "feat(web): chat + kartu konfirmasi aksi"`

---

### Task 15: QA milestone + dokumentasi

**Files:**
- Create: `docs/instalasi-lokal.md`, `docs/testing.md`, `ml/README.md`, `data/README.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: semua task sebelumnya.

- [ ] **Step 1: Jalankan seluruh verifikasi** — `npm run lint; npm run typecheck; npm run build` (root) → sukses; `cd apps/api; npx vitest run; npx vitest run --config vitest.config.e2e.ts` → semua PASS; `cd ml; .venv\Scripts\python -m pytest -q` → PASS.
- [ ] **Step 2: Uji jalur utama manual** — register → chat catat penjualan → konfirmasi → data muncul di `GET /sales`; login user kedua → tidak melihat data tenant pertama; provider dimatikan (`AI_PRIMARY=openai-compatible` tanpa key) → chat menjawab error ramah, tanpa mutasi.
- [ ] **Step 3: Tulis dokumentasi** — `docs/instalasi-lokal.md`: cara membuat 3 database, isi `.env`, `prisma generate`, `migrate deploy`, seed, jalankan api/web/ml; `data/README.md`: lokasi + skema + larangan commit data; `docs/testing.md`: perintah test dan hasil nyata.
- [ ] **Step 4: Commit** — `git commit -am "docs: instalasi lokal, testing, data readme"` lalu laporkan hasil nyata (jangan klaim lulus tanpa output).

---

## Milestone berikutnya (belum dirinci, plan dibuat saat mulai)

- **M2**: CRUD penjualan/produk/pelanggan lengkap, overview + Recharts, impor CSV (preview → mapping → validasi → konfirmasi → laporan), tool chat baca analitik.
- **M3**: pipeline 5 model di `ml/` + FastAPI + `MlJob` polling + halaman Machine Learning.
- **M4**: hardening (throttler, prompt-injection test, Playwright), Swagger lengkap, panduan deploy VPS.

Alasan tidak dirinci sekarang: rincian M2-M4 bergantung pada hasil audit kolom (Task 3, masih gerbang persetujuan) dan bentuk nyata data tenant setelah slice chat terbukti.
