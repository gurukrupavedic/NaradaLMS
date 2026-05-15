#!/usr/bin/env pwsh
<#
PRODUCTION BUILD
Builds the API server and both portal apps for deployment.
#>

param(
    [string]$RepoRoot = (Resolve-Path ".").Path
)

Write-Host "`n=== NaradaLMS Production Build ===" -ForegroundColor Green
Set-Location $RepoRoot

$failed = $false

# Build server
Write-Host "`n[1/3] Building API server..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Server build FAILED" -ForegroundColor Red
    $failed = $true
}

# Build student portal
Write-Host "`n[2/3] Building Student Portal..." -ForegroundColor Cyan
Set-Location "$RepoRoot\apps\student-portal"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Student portal build FAILED" -ForegroundColor Red
    $failed = $true
}

# Build admin portal
Write-Host "`n[3/3] Building Admin Portal..." -ForegroundColor Cyan
Set-Location "$RepoRoot\apps\admin-portal"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Admin portal build FAILED" -ForegroundColor Red
    $failed = $true
}

Set-Location $RepoRoot

if ($failed) {
    Write-Host "`nBuild FAILED" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n=== All builds successful ===" -ForegroundColor Green
    Write-Host "Artifacts:" -ForegroundColor White
    Write-Host "  Server:          dist/" -ForegroundColor White
    Write-Host "  Student Portal:  apps/student-portal/.next/" -ForegroundColor White
    Write-Host "  Admin Portal:   apps/admin-portal/.next/" -ForegroundColor White
    exit 0
}
