# TrackSense AI - Network (LAN) mode
# Exposes the full real-time system on your local network so you can open it
# from your phone or another PC (same Wi-Fi) at:
#   http://<YOUR-LAN-IP>:3000
# Backend is bound to 0.0.0.0 on :8000, frontend on :3000.
param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000,
    [string]$LanIp = ""
)
$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Python = Join-Path $Root "tracksense-ai\venv\Scripts\python.exe"
$Frontend = Join-Path $Root "weather-whiplash-radar"

if (-not (Test-Path $Python)) {
    throw "Python venv not found at $Python. Run: python -m venv tracksense-ai\venv"
}

# Detect the machine's LAN IP (first non-loopback, non-APIPA IPv4 address)
if (-not $LanIp) {
    $LanIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.IPAddress -notmatch '\.1$' } |
        Sort-Object InterfaceMetric |
        Select-Object -First 1).IPAddress
}
if (-not $LanIp) {
    throw "Could not detect a LAN IP. Pass one manually: .\start-network.ps1 -LanIp 192.168.x.x"
}

function Test-PortInUse([int]$Port) {
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

Write-Host ""
Write-Host "=================================="
Write-Host " TRACKSENSE AI - NETWORK MODE"
Write-Host "=================================="
Write-Host "LAN IP: $LanIp"

if (Test-PortInUse $BackendPort) {
    throw "Port $BackendPort is already in use. Close the other TrackSense AI process and try again."
}
if (Test-PortInUse $FrontendPort) {
    throw "Port $FrontendPort is already in use. Close the other frontend process and try again."
}

# 1) Build the frontend with the LAN backend URL baked in
Write-Host "`n[1/3] Building frontend (backend = http://$($LanIp):$BackendPort)..."
Push-Location $Frontend
try {
    $env:VITE_API_URL = "http://$($LanIp):$BackendPort"
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

# 2) Start the backend on all interfaces
Write-Host "`n[2/3] Starting AI backend on http://0.0.0.0:$BackendPort ..."
$backend = Start-Process -FilePath $Python -ArgumentList @(
    "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "$BackendPort"
) -WorkingDirectory (Join-Path $Root "tracksense-ai") -PassThru -WindowStyle Minimized

# 3) Start the frontend (Nitro already listens on all interfaces)
Write-Host "[3/3] Starting frontend on http://0.0.0.0:$FrontendPort ..."
$env:PORT = "$FrontendPort"
$frontend = Start-Process -FilePath "node" -ArgumentList @(".output/server/index.mjs") `
    -WorkingDirectory $Frontend -PassThru -WindowStyle Minimized
Remove-Item Env:PORT -ErrorAction SilentlyContinue

# Open firewall ports (best-effort; requires admin)
foreach ($p in @($BackendPort, $FrontendPort)) {
    & netsh advfirewall firewall add rule name="TrackSenseAI Port $p" dir=in action=allow protocol=TCP localport=$p | Out-Null
}

# Wait for the backend to come online
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
Write-Host "  This PC:    http://localhost:$FrontendPort"
Write-Host "  On network: http://$($LanIp):$FrontendPort   <-- open this from phone/other PC"
Write-Host "  API docs:   http://$($LanIp):$BackendPort/docs"
Write-Host "  Health:     $($h.status) | model_loaded: $($h.model_loaded)"
Write-Host ""
Write-Host "If a phone/other PC can't connect: run this PowerShell as ADMIN once:"
Write-Host "  netsh advfirewall firewall add rule name=TrackSenseAI dir=in action=allow protocol=TCP localport=$($BackendPort),$($FrontendPort)"
Write-Host ""
Write-Host "Press Enter to stop the system..."
try {
    Read-Host | Out-Null
} finally {
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
}
