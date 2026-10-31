# Instalasi Lokal

## Prasyarat

- Node.js 20+
- MySQL 8.4 (Laragon) di port 3306
- Python 3.11+ (untuk `ml/`)

## Database

Buat database (sekali):

```sql
CREATE DATABASE toko_analitik_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE toko_analitik_ai_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE toko_analitik_ai_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## API

```bash
cd apps/api
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run start:dev
```

Seed akun demo: `demo@toko.local` / `demo12345`.

## Web

```bash
cd apps/web
npm install
npm run dev
```

Buka `http://localhost:3000`.

## ML (opsional, Milestone 3)

```bash
cd ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
pytest
```
