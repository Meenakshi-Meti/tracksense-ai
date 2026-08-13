# TrackSense AI - Complete local system
# Builds the React frontend, then starts the whole real-time system:
#   - FastAPI backend on :8000  (model inference + API)
#   - Frontend on :3000          (http://127.0.0.1:3000)
# One script, one system.
param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000
)
$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Python = Join-Path $Root "tracksense-ai\venv\Scripts\python.exe"
$Frontend = Join-Path $Root "weather-whiplash-radar"
$Api = Join-Path $Root "tracksense-ai\api"
$RunPy = Join-Path $Root "tracksense-ai\run.py"

if (-not (Test-Path $Python)) {
    throw "Python venv not found at $Python. Run: python -m venv tracksense-ai\venv"
}

function Test-PortInUse([int]$Port) {
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

Write-Host ""
Write-Host "=============================="
Write-Host " TRACKSENSE AI - FULL SYSTEM"
Write-Host "=============================="

if (Test-PortInUse $BackendPort) {
    throw "Port $BackendPort is already in use. Close the other TrackSense AI process and try again."
}
if (Test-PortInUse $FrontendPort) {
    throw "Port $FrontendPort is already in use. Close the other frontend process and try again."
}

# 1) Build the frontend (injects the backend URL so the UI talks to the AI engine)
Write-Host "`n[1/3] Building frontend..."
Push-Location $Frontend
try {
    $env:VITE_API_URL = "http://127.0.0.1:$BackendPort"
    if (Get-Command bun -ErrorAction SilentlyContinue) {
        bun install
        bun run build
    } else {
        npm install
        npm run build
    }
    Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue
} finally {
    Pop-Location
}

# 2) Start the FastAPI backend (model + API)
Write-Host "`n[2/3] Starting AI backend on http://127.0.0.1:$BackendPort ..."
$backend = Start-Process -FilePath $Python -ArgumentList @(
    "-m", "uvicorn", "api.main:app", "--host", "127.0.0.1", "--port", "$BackendPort"
) -WorkingDirectory (Join-Path $Root "tracksense-ai") -PassThru -WindowStyle Minimized

# 3) Start the built frontend (SSR Node server)
Write-Host "[3/3] Starting frontend on http://127.0.0.1:$FrontendPort ..."
$env:PORT = "$FrontendPort"
$frontend = Start-Process -FilePath "node" -ArgumentList @(".output/server/index.mjs") `
    -WorkingDirectory $Frontend -PassThru -WindowStyle Minimized
Remove-Item Env:PORT -ErrorAction SilentlyContinue

# Wait for the backend to come online (model load can take a while)
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    try {
        $h = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/health" -TimeoutSec 3
        if ($h.status -eq "ONLINE") { $ready = $true; break }
    } catch { }
}
if (-not $ready) {
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
    throw "Backend did not come online within 60s. Check the model checkpoint."
}

Write-Host ""
Write-Host "  Frontend:  http://127.0.0.1:$FrontendPort"
Write-Host "  API docs:  http://127.0.0.1:$BackendPort/docs"
Write-Host "  Health:    $($h.status) | model_loaded: $($h.model_loaded)"
Write-Host ""
Write-Host "Press Enter to stop the system..."
try {
    Read-Host | Out-Null
} finally {
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
}
