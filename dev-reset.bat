@echo off
REM Chatbot UMKM - Clean reset. Deletes node_modules and build artifacts.
setlocal

echo.
echo ==================================================
echo   Chatbot UMKM - Development Reset
echo   WARNING: deletes node_modules
echo ==================================================
echo.
set /p confirm="Type yes to continue (Enter to cancel): "
if /i not "%confirm%"=="yes" (
    echo Cancelled.
    pause
    exit /b 0
)
cd /d "%~dp0"

echo [1/4] Stopping node processes...
taskkill /F /IM node.exe >nul 2>nul
echo       Done

echo [2/4] Removing build artifacts...
if exist "apps\api\dist" rmdir /s /q "apps\api\dist"
if exist "apps\web\.next" rmdir /s /q "apps\web\.next"
if exist "packages\ui\dist" rmdir /s /q "packages\ui\dist"
echo       Done

echo [3/4] Removing node_modules...
if exist "node_modules" rmdir /s /q "node_modules"
if exist "apps\api\node_modules" rmdir /s /q "apps\api\node_modules"
if exist "apps\web\node_modules" rmdir /s /q "apps\web\node_modules"
if exist "packages\ui\node_modules" rmdir /s /q "packages\ui\node_modules"
echo       Done

echo [4/4] Clearing npm cache...
call npm cache clean --force >nul 2>nul
echo       Done

echo.
echo Reset complete. Run dev-setup.bat to reinstall.
echo.
pause