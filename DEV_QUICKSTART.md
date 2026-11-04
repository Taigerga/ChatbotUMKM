# Development Quick Start

Scripts untuk menjalankan Chatbot UMKM development environment.

## Prerequisites

- **Node.js 18+** ([download](https://nodejs.org))
- **Python 3.9+** (untuk ML service)
- **MySQL 8.0+** (running locally atau remote)

## Setup Pertama Kali

```bash
dev-setup.bat
```

Ini akan:
1. ✓ Verifikasi Node.js & npm
2. ✓ Install dependencies root + apps
3. ✓ Setup ML Python venv
4. ✓ Create `.env` files dari `.env.example`
5. ✓ Prompts untuk edit `.env` dengan API keys Anda

**Jangan lupa:**
- Edit `apps/api/.env`: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_COMPAT_API_KEY`, `AI_CONFIG_ENCRYPTION_KEY`
- Edit `ml/.env`: ML service configuration (jika diperlukan)

## Run Development

### Batch (Windows Command Prompt)

```bash
dev.bat
```

Membuka 3 windows:
- **API** (http://localhost:3001/api/v1)
- **Web** (http://localhost:3000)
- **ML** (http://127.0.0.1:8001/docs) — optional, jika venv ada

### PowerShell

```bash
.\dev.ps1
```

Opsi:
```bash
.\dev.ps1 -SkipML   # Lewati ML service
```

## Services

| Service | Port | URL | Command |
|---------|------|-----|---------|
| Backend API | 3001 | http://localhost:3001/api/v1 | `npm run start:dev` di apps/api |
| Frontend | 3000 | http://localhost:3000 | `npm run dev` di apps/web |
| ML Service | 8001 | http://127.0.0.1:8001/docs | `python -m uvicorn src.service:app --reload` di ml |

## Login Demo

**Email:** `demo@toko.local`  
**Password:** `demo12345`

## Common Issues

### "node_modules not found"
```bash
dev-setup.bat
```

### "ML venv not found"
Setup manual:
```bash
cd ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Database connection error
Periksa `apps/api/.env`:
- `DATABASE_URL` harus point ke MySQL Anda
- Default: `mysql://root:@localhost:3306/toko_analitik_ai`

### Port already in use
Jika port 3000/3001 sudah dipakai:
1. Cari process: `netstat -ano | findstr :3000`
2. Kill: `taskkill /PID <PID> /F`
3. Atau ubah port di `.env`

## Clean Reset

```bash
dev-reset.bat
```

Ini akan:
- Stop semua node processes
- Delete `node_modules` dan build artifacts
- Clear npm cache

Kemudian jalankan `dev-setup.bat` lagi.

## Manual Setup (Tanpa Scripts)

```bash
# Install dependencies
npm install

# Setup API
cd apps/api
cp .env.example .env          # Edit dengan secrets Anda
npm run start:dev

# Setup Frontend (tab baru)
cd apps/web
npm run dev

# Setup ML (tab baru, optional)
cd ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn src.service:app --host 127.0.0.1 --port 8001 --reload
```

## Build for Production

```bash
npm run build    # Build semua apps
npm run typecheck
npm run lint
```

## More Info

- Backend docs: `apps/api/README.md`
- Frontend docs: `apps/web/README.md`
- ML docs: `ml/README.md`
