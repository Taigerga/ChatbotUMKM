@echo off
REM Chatbot UMKM - First-time setup
setlocal

echo.
echo ==================================================
echo   Chatbot UMKM - Development Setup
echo ==================================================
echo.
cd /d "%~dp0"

echo [1/5] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not installed. Get it from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo       Node.js %%i OK

echo [2/5] Checking npm...
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm not installed.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do echo       npm %%i OK

echo [3/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)
echo       Dependencies installed OK

echo [4/5] Setting up ML environment...
if not exist "ml\.venv" (
    cd ml
    python -m venv .venv
    if errorlevel 1 (
        echo [WARNING] Failed to create ML venv. Skipping ML.
        cd ..
    ) else (
        call .venv\Scripts\activate.bat
        pip install -r requirements.txt
        cd ..
        echo       ML venv ready OK
    )
) else (
    echo       ML venv already exists OK
)

echo [5/5] Checking .env files...
if not exist "apps\api\.env" (
    if exist "apps\api\.env.example" (
        copy "apps\api\.env.example" "apps\api\.env" >nul
        echo       Created apps\api\.env from .env.example - EDIT IT with your secrets
    )
)
if not exist "ml\.env" (
    if exist "ml\.env.example" (
        copy "ml\.env.example" "ml\.env" >nul
        echo       Created ml\.env from .env.example
    )
)

echo.
echo Setup complete.
echo Next: edit apps\api\.env (DATABASE_URL, JWT_SECRET, OPENAI_COMPAT_API_KEY, AI_CONFIG_ENCRYPTION_KEY)
echo Then run: dev.bat
echo.
pause