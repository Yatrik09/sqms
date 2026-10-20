# Start SQMS FastAPI Backend Server
Write-Host "Starting SQMS Backend on http://127.0.0.1:8001..." -ForegroundColor Cyan
Set-Location -Path (Join-Path $PSScriptRoot "..\backend")
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

