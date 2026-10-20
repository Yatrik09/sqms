# Master launcher for SQMS Ecosystem
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting SQMS Full-Stack Platform" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$backendScript = Join-Path $PSScriptRoot "start_backend.ps1"
$frontendScript = Join-Path $PSScriptRoot "start_frontend.ps1"

Start-Process powershell -ArgumentList "-NoExit", "-File", "`"$backendScript`""
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-File", "`"$frontendScript`""

Write-Host "`nBackend Server launched:  http://127.0.0.1:8001" -ForegroundColor Green
Write-Host "API Interactive Docs:     http://127.0.0.1:8001/docs" -ForegroundColor Green
Write-Host "Frontend Application:     http://127.0.0.1:5173" -ForegroundColor Green
Write-Host "`nAll systems operational!" -ForegroundColor Yellow
