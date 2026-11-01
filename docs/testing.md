# Pengujian

## Perintah utama

```bash
npm run lint
npm run typecheck
npm run build
```

Di level root (turbo) atau per workspace.

## API

```bash
cd apps/api
npm run test          # unit
npm run test:e2e      # e2e (memakai .env dev)
```

E2E mencakup: auth, isolasi tenant, sales, chat usul/konfirmasi, seed.

## Web

```bash
cd apps/web
npm run typecheck
npm run build
```

## ML

```bash
cd ml
.venv\Scripts\python -m pytest
```

ML service butuh env dari `ml/.env` (tidak auto-load, `python-dotenv` tidak terpasang). Jalankan:

```powershell
Get-Content .env | ForEach-Object { if ($_ -match '^\s*([A-Za-z_]+)\s*=\s*(.*)$') { Set-Item -Path ("Env:" + $matches[1]) -Value $matches[2].Trim('"') } }
.venv\Scripts\python -m uvicorn src.service:app --host 127.0.0.1 --port 8001
```

Cek `GET /models` (header `x-ml-token` bila `ML_INTERNAL_TOKEN` diisi): status per model `ready` / `limited` / `not_ready`. `limited` = metrik di bawah ambang (forecast MAPE > naive, churn PR-AUC < 0.5) atau sampel di bawah minimum.

## Catatan

- E2E memakai `DATABASE_URL` dev, bukan DB test, karena menguji flow nyata. Jangan jalankan bersamaan dengan data produksi.
- Jangan `prisma migrate reset` atau `db push --force-reset`.
