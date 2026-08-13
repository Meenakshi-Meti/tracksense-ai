# TrackSense AI — Development mode
# Runs the FastAPI backend (port 8000) and the Vite frontend together,
# so the frontend hot-reloads while calling the live AI API.
param(
    [int]$BackendPort = 8000
)
$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Python = Join-Path $Root "tracksense-ai\venv\Scripts\python.exe"
$Frontend = Join-Path $Root "weather-whiplash-radar"
$Api = Join-Path $Root "tracksense-ai\api"

if (-not (Test-Path $Python)) {
    throw "Python venv not found at $Python. Run: python -m venv tracksense-ai\venv"
}

Write-Host ""
Write-Host "=================================="
Write-Host " TRACKSENSE AI - DEVELOPMENT MODE"
Write-Host "=================================="
Write-Host "`nStarting FastAPI backend on http://127.0.0.1:$BackendPort ..."

$backend = Start-Process -FilePath $Python -ArgumentList @(
    "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "$BackendPort", "--reload"
) -WorkingDirectory $Api -PassThru -WindowStyle Minimized

Write-Host "Starting Vite frontend (dev server)..."
$frontend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory $Frontend -PassThru -WindowStyle Minimized

Write-Host ""
Write-Host "  API:       http://127.0.0.1:$BackendPort"
Write-Host "  Docs:      http://127.0.0.1:$BackendPort/docs"
Write-Host "  Frontend:  see its terminal window for the port"
Write-Host ""
Write-Host "Press Enter to stop both processes..."

try {
    Read-Host | Out-Null
} finally {
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
}
