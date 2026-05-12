#!/usr/bin/env pwsh
<#
DEVELOPMENT QUICK START
Starts the API server and both portal apps for local development.
Usage: powershell -ExecutionPolicy Bypass -File scripts/dev-start.ps1
#>

param(
    [string]$RepoRoot = (Resolve-Path ".").Path
)

Write-Host "`n=== NaradaLMS Development Start ===" -ForegroundColor Green

# Check if PostgreSQL is running
try {
    $pgCheck = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue -InformationLevel Quiet
    if (-not $pgCheck) {
        Write-Host "PostgreSQL not running on port 5432. Start it first:" -ForegroundColor Red
        Write-Host "  docker-compose up -d postgres" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "Could not check PostgreSQL status. Continuing..." -ForegroundColor Yellow
}

Write-Host "Starting API server (port 5000)..." -ForegroundColor Cyan
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $RepoRoot -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting Student Portal (port 3000)..." -ForegroundColor Cyan
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "$RepoRoot\apps\student-portal" -WindowStyle Normal

Write-Host "Starting Admin Portal (port 3010)..." -ForegroundColor Cyan
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "$RepoRoot\apps\admin-portal" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "`nAll services starting:" -ForegroundColor Green
Write-Host "  API Server:      http://localhost:5000" -ForegroundColor White
Write-Host "  Student Portal:  http://localhost:3000" -ForegroundColor White
Write-Host "  Admin Portal:   http://localhost:3010" -ForegroundColor White
Write-Host "`nWait 5-10 seconds for Next.js to compile..." -ForegroundColor Yellow
