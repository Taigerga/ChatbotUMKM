@echo off
REM Chatbot UMKM Development Setup
REM Install dependencies, set up database, and configure environment

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  Chatbot UMKM - Development Setup                     ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Check Node.js
echo [1/5] Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not installed. Download from https://nodejs.org
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo       Node.js %NODE_VERSION% ✓

REM Check npm
echo [2/5] Checking npm...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not installed.
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo       npm %NPM_VERSION% ✓

REM Install dependencies
echo [3/5] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies.
    exit /b 1
)
echo       Dependencies installed ✓

REM Set up ML venv
echo [4/5] Setting up ML environment...
if not exist "ml\.venv" (
    cd ml
    python -m venv .venv
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] Failed to create ML venv. Skipping.
        cd ..
    ) else (
        call .venv\Scripts\activate.bat
        pip install -r requirements.txt
        if %ERRORLEVEL% NEQ 0 (
            echo [WARNING] Failed to install ML dependencies.
        ) else (
            echo       ML venv ready ✓
        )
        cd ..
    )
) else (
    echo       ML venv already exists ✓
)

REM Check .env files
echo [5/5] Checking .env files...
if not exist "apps\api\.env" (
    echo [WARNING] apps/api/.env not found. Copy from .env.example and fill in your keys.
    if exist "apps\api\.env.example" (
        copy "apps\api\.env.example" "apps\api\.env"
        echo       Created apps/api/.env from .env.example (edit with your secrets)
    )
)

if not exist "ml\.env" (
    if exist "ml\.env.example" (
        copy "ml\.env.example" "ml\.env"
        echo       Created ml/.env from .env.example
    )
)

echo.
echo ✓ Setup complete!
echo.
echo Next steps:
echo   1. Edit apps/api/.env with your database and API keys
echo   2. Run: dev.bat
echo.
pause
