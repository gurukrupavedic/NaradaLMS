#!/usr/bin/env pwsh
# Dev-only database reset for PostgreSQL on Windows
# Drops the public schema in the target DB, recreates it, then pushes Drizzle schema (--force)

param(
  [string]$RepoRoot = (Resolve-Path ".").Path
)

Write-Host "`n=== VedicLMS • Dev DB Reset ===" -ForegroundColor Green
Set-Location $RepoRoot

# Read .env for DATABASE_URL or PG* variables
$envPath = Join-Path $RepoRoot ".env"
if (!(Test-Path $envPath)) { throw "Missing .env at $envPath" }

$envMap = @{}
Get-Content $envPath | ForEach-Object {
  if ($_ -match '^(\w+)=(.*)$') { $envMap[$matches[1]] = $matches[2] }
}

# Build DATABASE_URL if not present
if (-not $envMap["DATABASE_URL"]) {
  $pgHost = $envMap["PGHOST"]
  $pgPort = $envMap["PGPORT"]
  $pgUser = $envMap["PGUSER"]
  $pgPass = $envMap["PGPASSWORD"]
  $pgDb   = $envMap["PGDATABASE"]
  if (-not ($pgHost -and $pgUser -and $pgPass -and $pgDb)) { throw "Missing PG* variables in .env and no DATABASE_URL" }
  $envMap["DATABASE_URL"] = "postgresql://$($pgUser):$($pgPass)@$($pgHost):$($pgPort)/$($pgDb)"
}

$env:DATABASE_URL = $envMap["DATABASE_URL"]
Write-Host "Using DATABASE_URL: $($env:DATABASE_URL)" -ForegroundColor Cyan

# Extract database name for psql -d
$dbName = $null
if ($env:DATABASE_URL -match '/([^/?]+)($|\?)') { $dbName = $matches[1] }
if (-not $dbName) { throw "Unable to parse database name from DATABASE_URL" }

# PostgreSQL psql path (adjust if needed)
$psqlPaths = @(
  "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe",
  "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe",
  "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe"
)
$psql = $psqlPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $psql) { throw "psql.exe not found (install PostgreSQL or update script path)" }

# For local dev, set PGPASSWORD if present in .env
if ($envMap["PGPASSWORD"]) { $env:PGPASSWORD = $envMap["PGPASSWORD"] }

Write-Host "Dropping public schema in '$dbName'..." -ForegroundColor Yellow
if (-not $envMap["PGUSER"]) { $envMap["PGUSER"] = "postgres" }
if (-not $envMap["PGHOST"]) { $envMap["PGHOST"] = "localhost" }
& $psql -U $envMap["PGUSER"] -h $envMap["PGHOST"] -d $dbName -c "DROP SCHEMA IF EXISTS public CASCADE;" | Out-String | Write-Host

Write-Host "Recreating public schema..." -ForegroundColor Yellow
& $psql -U $envMap["PGUSER"] -h $envMap["PGHOST"] -d $dbName -c "CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;" | Out-String | Write-Host

Write-Host "Applying Drizzle schema (--force)..." -ForegroundColor Yellow
npx drizzle-kit push --force | Out-String | Write-Host

Write-Host "`nDB reset complete" -ForegroundColor Green
