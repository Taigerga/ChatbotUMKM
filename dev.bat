@echo off
REM Chatbot UMKM Development Environment Launcher
REM Runs: Database, Backend API, ML Service, Frontend (all parallel)

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  Chatbot UMKM - Development Environment               ║
echo ║  Backend(3001) | Frontend(3000) | ML(8001)            ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [ERROR] node_modules not found. Run setup first:
    echo   dev-setup.bat
    exit /b 1
)

REM Check if ml venv exists
if not exist "ml\.venv" (
    echo [WARNING] ML venv not found. Skipping ML service.
    echo   To enable ML: cd ml ^&^& python -m venv .venv ^&^& .venv\Scripts\activate ^&^& pip install -r requirements.txt
    set ML_SKIP=1
) else (
    set ML_SKIP=0
)

echo [1/4] Starting Backend API (port 3001)...
cd apps\api
start "Chatbot UMKM - API" /d "%cd%" cmd /k "npm run start:dev"
cd ..\..

timeout /t 2 /nobreak

echo [2/4] Starting Frontend Dev Server (port 3000)...
cd apps\web
start "Chatbot UMKM - Web" /d "%cd%" cmd /k "npm run dev"
cd ..\..

timeout /t 2 /nobreak

if %ML_SKIP% == 0 (
    echo [3/4] Starting ML Service (port 8001)...
    cd ml
    start "Chatbot UMKM - ML" /d "%cd%" cmd /k ".venv\Scripts\activate && python -m uvicorn src.service:app --host 127.0.0.1 --port 8001 --reload"
    cd ..
    echo [4/4] All services starting. Open browser: http://localhost:3000
) else (
    echo [3/4] ML Service skipped (not configured)
    echo All services starting. Open browser: http://localhost:3000
)

echo.
echo Services running:
echo   Web:     http://localhost:3000
echo   API:     http://localhost:3001/api/v1
echo   ML:      http://127.0.0.1:8001/docs (if enabled)
echo.
echo Press Ctrl+C in each window to stop.
echo.
pause
