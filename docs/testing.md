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

## Seller CV — Katalog Visual

Service CV terpisah dari `ml/`. Jalankan dari `cv/` dengan dependency `cv/requirements.txt` (plus `uvicorn` untuk serving; keduanya belum terpasang di mesin ini):

```bash
cd cv
python -m uvicorn app.main:app --host 127.0.0.1 --port 8002
```

Cek `GET http://127.0.0.1:8002/health`; `model_ready` baru true setelah model dimuat saat scan pertama. `GET /classes` dan `POST /scan` butuh header `x-cv-token` bila `CV_INTERNAL_TOKEN` diisi.

API (NestJS) memakai env:

- `CV_SERVICE_URL` — default `http://127.0.0.1:8002`.
- `CV_INTERNAL_TOKEN` — default `""`; harus sama dengan `CV_INTERNAL_TOKEN` di proses CV service agar header `x-cv-token` cocok.

Upload `/scan`: JPEG/PNG/WEBP, maksimal 10 MB (`CV_MAX_UPLOAD_BYTES=10485760`). MIME dan format PIL divalidasi server. Bytes gambar tidak disimpan.

Bersihkan dataset dan split ulang — menghilangkan leakage sumber video antar-split (grup dari stem `_mp4-`), meng-clamp box di luar frame, membuang box berukuran nol:

```bash
cd cv
python -m scripts.clean_dataset --source ../data/computervision/PhantomStock.v1i.yolo26 --target data/cleaned --seed 42
```

Output: `cv/data/cleaned/data.yaml` (`nc: 1114`), `train.txt`/`valid.txt`/`test.txt`, serta gambar dan label per split.

Training (baseline `yolo26n.pt`, `imgsz=640`, `conf=0.25`):

```bash
cd cv
python -m scripts.train --data data/cleaned/data.yaml --artifacts artifacts --epochs 30
# smoke 1 epoch, 200 gambar per split:
python -m scripts.train --data data/cleaned/data.yaml --artifacts artifacts --epochs 1 --limit-images 200
```

Artefak: `cv/artifacts/cv-best.pt` dan `cv/artifacts/metadata.json` (`model_version`, `nc`, `names`, metrik). Keduanya belum ada di worktree ini.

Batasan akurasi: 1.114 kelas, 1.090 di antaranya punya <100 sampel. Deteksi kelas langka confidence rendah dan tetap menjadi usulan; Penjual wajib mengonfirmasi/memetakan manual. "box terdeteksi" BUKAN stok — jangan dipakai untuk auto-update stok, harga, atau SKU. Domain gap antara foto rak nyata dan dataset perlu diverifikasi manual.

Status verifikasi worktree ini:

- PASS: `python -m pytest -q` di `cv/` (24 test); `npm run typecheck --workspace web`; `npm run lint --workspace web`; `npm run build --workspace api`; `npm run test --workspace api` (13 test); `npm run test:e2e --workspace api -- cv.e2e-spec.ts` (13 test).
- E2E penuh: 36/37 test lulus; satu kegagalan pra-adanya di `test/seed.e2e-spec.ts` (`expected 53820 to be 5`), tidak terkait CV.
- BLOCKED: `python -m pytest -v` di `ml/` — 14 passed, 2 failed saat koleksi karena `data/raw/ecommerce_sales_customer_analytics_150k.csv` (gitignored) tidak ada di worktree. Bukan kegagalan import `joblib`/`pandas`.
- BLOCKED: smoke training — `ModuleNotFoundError: No module named 'ultralytics'`; artefak tidak terbentuk. `uvicorn` juga belum terpasang.
- Manual: deteksi langsung di UI `/cv-katalog` memakai foto rak nyata dan respons CV sungguhan belum terverifikasi (belum ada service/weights). Ulangi setelah artefak tersedia.

### Deploy/CI seller CV

Fitur ini tidak berfungsi tanpa dataset bersih dan weights. Pipeline deploy/CI wajib melakukan langkah berikut (atau menyuplai artefak yang sudah jadi):

1. Migrasi API: `cd apps/api && npx prisma generate && npx prisma migrate deploy`. Pastikan `20261124000000_cv_catalog` ikut terpasang (migrasi ini sudah ada di base `d113ed2`). Untuk CI dari commit base lain: checkout `<base>`, jalankan `npx prisma migrate deploy` di direktori migrasi base itu, lalu terapkan migrasi CV di atasnya.
2. Siapkan dataset sumber di `data/computervision/PhantomStock.v1i.yolo26`, lalu jalankan perintah cleaning di atas sampai `cv/data/cleaned/data.yaml` dan split_txt ada.
3. Jalankan training sampai `cv/artifacts/cv-best.pt` + `metadata.json` terbentuk, atau salin keduanya beserta `data/cleaned/` dari pipeline terpercaya.
4. Set `CV_SERVICE_URL`, `CV_INTERNAL_TOKEN`, `CV_TIMEOUT_MS` (default `60000` ms) di API dan `CV_INTERNAL_TOKEN` yang sama di service CV.

Tanpa langkah 2–3, `GET /classes` mengembalikan 503 `DATA_NOT_READY` dan `POST /scan` mengembalikan 503 `MODEL_NOT_READY`. Tanpa langkah 1, rute CV gagal di database.

### Pemblokir produksi

- Keputusan lisensi Ultralytics (AGPL vs Enterprise) belum final. Jangan aktifkan fitur CV di produksi sampai owner memutuskan lisensi.
