@echo off
REM Chatbot UMKM Development Environment Launcher
REM Starts: Backend API (3001), Frontend (3000), ML Service (8001)
setlocal

echo.
echo ==================================================
echo   Chatbot UMKM - Development Environment
echo   Backend(3001) ^| Frontend(3000) ^| ML(8001)
echo ==================================================
echo.
cd /d "%~dp0"

if not exist "node_modules" (
    echo [ERROR] node_modules not found. Run dev-setup.bat first.
    pause
    exit /b 1
)

set ML_SKIP=1
if exist "ml\.venv" set ML_SKIP=0

echo [1/3] Starting Backend API (port 3001)...
start "Chatbot UMKM - API" cmd /k "cd /d ""%~dp0apps\api"" && npm run start:dev"

echo [2/3] Starting Frontend (port 3000)...
start "Chatbot UMKM - Web" cmd /k "cd /d ""%~dp0apps\web"" && npm run dev"

if "%ML_SKIP%"=="0" (
    echo [3/3] Starting ML Service...
    start "Chatbot UMKM - ML" cmd /k "cd /d ""%~dp0ml"" && .venv\Scripts\activate.bat && python -m uvicorn src.service:app --host 127.0.0.1 --port 8001 --reload"
) else (
    echo [3/3] ML Service skipped - venv not found
)

echo.
echo Services starting in separate windows:
echo   Web: http://localhost:3000
echo   API: http://localhost:3001/api/v1
echo   ML:  http://127.0.0.1:8001/docs (if enabled)
echo.
echo Close this window or press any key to exit.
pause >nul