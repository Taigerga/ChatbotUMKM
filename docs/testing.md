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

## Catatan

- E2E memakai `DATABASE_URL` dev, bukan DB test, karena menguji flow nyata. Jangan jalankan bersamaan dengan data produksi.
- Jangan `prisma migrate reset` atau `db push --force-reset`.
