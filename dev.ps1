# Chatbot UMKM - Development Environment (PowerShell)
# Runs: Backend (3001) | Frontend (3000) | ML Service (8001)
# Usage: .\dev.ps1

param(
  [switch]$SkipML = $false
)

$ErrorActionPreference = "Stop"
$RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Chatbot UMKM - Development Environment               ║" -ForegroundColor Cyan
Write-Host "║  Backend(3001) | Frontend(3000) | ML(8001)            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check node_modules
if (-not (Test-Path "$RootPath\node_modules")) {
  Write-Host "[ERROR] node_modules not found. Run setup first:" -ForegroundColor Red
  Write-Host "  dev-setup.bat" -ForegroundColor Yellow
  exit 1
}

# Check ML venv
$mlVenv = "$RootPath\ml\.venv"
$mlAvailable = (Test-Path $mlVenv) -and (-not $SkipML)

# Function to start service in new window
function Start-Service {
  param([string]$Name, [string]$Path, [string]$Command)
  Write-Host "[*] Starting $Name..." -ForegroundColor Green
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Path'; $Command" -WindowStyle Normal
}

# Start services
$apiPath = "$RootPath\apps\api"
$webPath = "$RootPath\apps\web"
$mlPath = "$RootPath\ml"

Start-Service "Backend API (port 3001)" $apiPath "npm run start:dev"
Start-Sleep -Seconds 2

Start-Service "Frontend (port 3000)" $webPath "npm run dev"
Start-Sleep -Seconds 2

if ($mlAvailable) {
  Write-Host "[*] Starting ML Service (port 8001)..." -ForegroundColor Green
  $mlCmd = "& '$mlVenv\Scripts\Activate.ps1'; python -m uvicorn src.service:app --host 127.0.0.1 --port 8001 --reload"
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$mlPath'; $mlCmd" -WindowStyle Normal
} else {
  Write-Host "[!] ML Service skipped (venv not found or --SkipML flag used)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Services running in separate windows:" -ForegroundColor Cyan
Write-Host "  Web:     http://localhost:3000"
Write-Host "  API:     http://localhost:3001/api/v1"
if ($mlAvailable) {
  Write-Host "  ML:      http://127.0.0.1:8001/docs"
}
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop a service." -ForegroundColor Gray
Write-Host ""
