#!/usr/bin/env pwsh
<#
MASTER VERIFICATION SCRIPT
Run after every phase to verify nothing is broken.
Usage: powershell -ExecutionPolicy Bypass -File scripts/verify/all.ps1

Requires:
- Server running on http://localhost:5000
- PostgreSQL running
#>

param(
    [string]$RepoRoot = (Resolve-Path ".").Path,
    [switch]$SkipBuild,
    [switch]$SkipSmoke
)

Write-Host "`n" -NoNewline
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       NaradaLMS Verification Suite               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan

Set-Location $RepoRoot
$allPassed = $true

# Step 1: Build check
if (-not $SkipBuild) {
    Write-Host "`n── Step 1: Build Verification ──" -ForegroundColor Yellow
    powershell -ExecutionPolicy Bypass -File scripts/build/check.ps1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build verification FAILED" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "`n── Step 1: Build Verification - SKIPPED ──" -ForegroundColor DarkGray
}

# Step 2: API Smoke test
if (-not $SkipSmoke) {
    Write-Host "`n── Step 2: API Smoke Tests ──" -ForegroundColor Yellow
    npx tsx scripts/test/smoke/api-smoke-test.ts
    if ($LASTEXITCODE -ne 0) {
        Write-Host "API smoke tests FAILED" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "`n── Step 2: API Smoke Tests - SKIPPED ──" -ForegroundColor DarkGray
}

# Step 3: Content smoke test (existing)
Write-Host "`n── Step 3: Content Module Smoke Test ──" -ForegroundColor Yellow
npx tsx scripts/test/smoke/content-smoke.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "Content smoke test FAILED" -ForegroundColor Red
    $allPassed = $false
}

# Summary
Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "║  ✅ ALL VERIFICATION CHECKS PASSED               ║" -ForegroundColor Green
} else {
    Write-Host "║  ❌ SOME VERIFICATION CHECKS FAILED              ║" -ForegroundColor Red
}
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not $allPassed) { exit 1 }
