#!/usr/bin/env pwsh
<#
BUILD VERIFICATION SCRIPT
Checks that all workspaces compile without errors.
Run: powershell -ExecutionPolicy Bypass -File scripts/build/check.ps1
#>

param(
    [string]$RepoRoot = (Resolve-Path ".").Path
)

Write-Host "`n=== NaradaLMS Build Check ===" -ForegroundColor Green
Set-Location $RepoRoot

$failed = $false

# Check 1: TypeScript compilation (root monolith)
Write-Host "`n[1/4] Checking root TypeScript compilation..." -ForegroundColor Cyan
$result = npm run check 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  FAILED: Root TypeScript check" -ForegroundColor Red
    Write-Host $result
    $failed = $true
} else {
    Write-Host "  OK" -ForegroundColor Green
}

# Check 2: Student Portal build
Write-Host "`n[2/4] Checking student-portal build..." -ForegroundColor Cyan
Set-Location "$RepoRoot/apps/student-portal"
$result = npx next build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  FAILED: Student portal build" -ForegroundColor Red
    Write-Host $result
    $failed = $true
} else {
    Write-Host "  OK" -ForegroundColor Green
}

# Check 3: Admin Portal build
Write-Host "`n[3/4] Checking admin-portal build..." -ForegroundColor Cyan
Set-Location "$RepoRoot/apps/admin-portal"
$result = npx next build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  FAILED: Admin portal build" -ForegroundColor Red
    Write-Host $result
    $failed = $true
} else {
    Write-Host "  OK" -ForegroundColor Green
}

# Check 4: Server ESBuild
Write-Host "`n[4/4] Checking server build..." -ForegroundColor Cyan
Set-Location $RepoRoot
$result = npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  FAILED: Server build" -ForegroundColor Red
    Write-Host $result
    $failed = $true
} else {
    Write-Host "  OK" -ForegroundColor Green
}

Set-Location $RepoRoot

if ($failed) {
    Write-Host "`nBuild check FAILED" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`nAll builds passed" -ForegroundColor Green
    exit 0
}
