#!/usr/bin/env pwsh
<#
================================================================================
DATABASE RESET SCRIPT (DEVELOPMENT ONLY)
================================================================================

WHAT IS THIS?
A PowerShell script that completely wipes your local database and rebuilds it
from scratch. Think of it like a "factory reset" for your database.

CREATED: Early development phase (2024)

PURPOSE:
To give you a clean, fresh database when you need to:
- Fix database corruption issues
- Start testing from a clean state
- Remove all test data and start fresh
- Apply new database schema changes cleanly

⚠️ WARNING: THIS DELETES ALL DATA IN YOUR DATABASE!
Use this ONLY on your local development database, NEVER on production!

WHEN TO USE IT:
- Your database has test data you want to remove
- Database migrations got messed up
- You want to test with a clean database
- Schema changes didn't apply correctly

WHEN NOT TO USE IT:
- On production database (you'll lose all real data!)
- If you have important test data you want to keep
- When working with real user data

HOW TO RUN IT:
1. Make sure PostgreSQL is installed on your computer
2. Make sure your .env file has database credentials
3. Close any programs using the database
4. Run: .\tests\db-reset.ps1

WHAT IT DOES (STEP BY STEP):
Step 1: Reads your .env file to get database connection info
Step 2: Connects to your PostgreSQL database
Step 3: DROPS the entire "public" schema (deletes all tables and data)
Step 4: Creates a new empty "public" schema
Step 5: Runs Drizzle versioned migrations (`./migrations`) to recreate all tables fresh
Step 6: Your database is now clean and empty

SUCCESS LOOKS LIKE:
You'll see:
- "Dropping public schema..." 
- "Recreating public schema..."
- "Applying Drizzle migrations..."
- "DB reset complete" in green

FAILURE LOOKS LIKE:
- "Missing .env" - You need a .env file with database credentials
- "psql.exe not found" - PostgreSQL is not installed or not in expected location
- Connection errors - Database credentials in .env are wrong

REQUIREMENTS:
- PostgreSQL installed (version 16, 17, or 18)
- .env file with DATABASE_URL or PG* variables
- Windows PowerShell
- Node.js and npm (for `drizzle-kit migrate`)

RECOVERY:
If something goes wrong, your database will be in a broken state.
Just run this script again - it will rebuild everything from scratch.

⚠️ REMEMBER: This is for LOCAL DEVELOPMENT ONLY!
================================================================================
#>

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

Write-Host "Applying Drizzle migrations..." -ForegroundColor Yellow
npx drizzle-kit migrate | Out-String | Write-Host

Write-Host "`nDB reset complete" -ForegroundColor Green
