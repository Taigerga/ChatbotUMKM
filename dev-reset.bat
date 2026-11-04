@echo off
REM Chatbot UMKM Development Reset
REM Stop all services, clean build artifacts, reset node_modules

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  Chatbot UMKM - Development Reset                     ║
echo ║  WARNING: This will delete node_modules                ║
echo ╚════════════════════════════════════════════════════════╝
echo.

set /p confirm="Type 'yes' to continue (or press Enter to cancel): "
if /i not "%confirm%"=="yes" (
    echo Cancelled.
    exit /b 0
)

echo.
echo [1/4] Stopping all node processes...
taskkill /F /IM node.exe >nul 2>nul
echo       Node processes stopped ✓

echo [2/4] Cleaning build artifacts...
if exist "apps\api\dist" rmdir /s /q "apps\api\dist" && echo       apps/api/dist removed
if exist "apps\web\.next" rmdir /s /q "apps\web\.next" && echo       apps/web/.next removed
if exist "packages\ui\dist" rmdir /s /q "packages\ui\dist" && echo       packages/ui/dist removed
if exist "node_modules\.turbo" rmdir /s /q "node_modules\.turbo" && echo       .turbo cache removed
echo       Build artifacts cleaned ✓

echo [3/4] Clearing npm cache...
call npm cache clean --force >nul 2>nul
echo       npm cache cleared ✓

echo [4/4] Removing node_modules...
cd apps\api && if exist node_modules rmdir /s /q node_modules && echo       apps/api/node_modules removed
cd ..\..\apps\web && if exist node_modules rmdir /s /q node_modules && echo       apps/web/node_modules removed
cd ..\..\packages\ui && if exist node_modules rmdir /s /q node_modules && echo       packages/ui/node_modules removed
cd ..\..\ && if exist node_modules rmdir /s /q node_modules && echo       root node_modules removed

echo.
echo ✓ Reset complete!
echo.
echo Run dev-setup.bat to reinstall dependencies.
echo.
pause
