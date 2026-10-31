# Panduan Deploy dan Operasional

## Variabel lingkungan
- Salin `apps/api/.env.example` ke `apps/api/.env` dan isi nilai aktual.
- Wajib: `DATABASE_URL`, `SHADOW_DATABASE_URL`, `JWT_SECRET`, `AI_PRIMARY`, `WEB_ORIGIN`, `PORT`, `ML_SERVICE_URL`, `ML_INTERNAL_TOKEN`.
- Jangan commit `.env`.

## Lokal (Laragon)
1. Pastikan MySQL 8.4 Laragon berjalan.
2. Buat database `toko_analitik_ai` bila belum ada.
3. `cd apps/api && npm install && npx prisma generate && npx prisma migrate deploy`
4. Seed opsional: `npm run seed` (jika script tersedia).
5. Jalankan API: `npm run start:dev`.
6. ML service: `cd ml && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt && .venv/Scripts/python -m uvicorn src.service:app --host 127.0.0.1 --port 8001`
7. Web: `cd apps/web && npm install && npm run dev`.

## Produksi (VPS)
1. Install Node.js versi LTS, Python 3.11+, MySQL/MariaDB, reverse proxy (Nginx/Caddy).
2. Buat database `toko_analitik_ai_prod` dan user MySQL khusus aplikasi dengan hak minimal.
3. Set `DATABASE_URL` ke database produksi.
4. Build API: `cd apps/api && npm ci && npm run build`.
5. Jalankan migrasi: `npx prisma migrate deploy` (jangan `migrate dev`).
6. Build web: `cd apps/web && npm ci && npm run build`.
7. Jalankan service dengan process manager (systemd/PM2). Buka hanya port 80/443 ke publik; FastAPI dan MySQL tetap internal.
8. Set `NODE_ENV=production`, `WEB_ORIGIN` ke domain frontend, `Secure` cookie aktif.

## Backup dan restore MySQL
Backup:
```bash
mysqldump -u app_user -p toko_analitik_ai > backup-$(date +%F).sql
```
Restore (hanya ke database baru/kosong yang sudah disiapkan):
```bash
mysql -u app_user -p toko_analitik_ai < backup-2026-01-01.sql
```
Jangan restore ke database milik proyek lain.

## Catatan ML
- Artefak model disimpan di `ml/artifacts` dan tidak dicommit.
- Training dijalankan manual melalui endpoint `/api/v1/ml/:model/train` atau job terjadwal, bukan setiap transaksi baru.
- FastAPI hanya boleh diakses dari backend melalui jaringan internal.
