# Start SQMS React Frontend
Write-Host "Starting SQMS Frontend on http://127.0.0.1:5173..." -ForegroundColor Green
Set-Location -Path (Join-Path $PSScriptRoot "..\frontend")
npx vite --host 127.0.0.1 --port 5173
