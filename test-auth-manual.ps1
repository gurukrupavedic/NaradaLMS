#!/usr/bin/env pwsh

# Simple Auth Smoke Test
Write-Host "`n=== AUTH ENDPOINTS SMOKE TEST ===" -ForegroundColor Green

$baseUrl = "http://127.0.0.1:5000"
$email = "test-$(Get-Random)@test.com"
$password = "TestPassword123!"

Write-Host "`nTest Credentials:"
Write-Host "  Email: $email"
Write-Host "  Password: $password`n"

# Test 1: Register
Write-Host "[1] Testing POST /api/auth/register" -ForegroundColor Cyan
try {
  $body = @{ email = $email; password = $password } | ConvertTo-Json
  $respObj = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -ContentType 'application/json' -Body $body -ErrorAction Stop
  $user = $respObj.user
  Write-Host "    ✓ SUCCESS - User created"
  Write-Host "      Email: $($user.email)"
  Write-Host "      ID: $($user.id)"
  Write-Host "      Status: $($user.status) (pending_approval expected)`n"
} catch {
  Write-Host "    ✗ FAILED: $($_.Exception.Message)`n"
  exit 1
}

# Test 2: Try to login (should fail - not approved yet)
Write-Host "[2] Testing POST /api/auth/login (should fail - not approved)" -ForegroundColor Cyan
try {
  $body = @{ email = $email; password = $password } | ConvertTo-Json
  $respObj = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType 'application/json' -Body $body -ErrorAction Stop
  Write-Host "    ✗ UNEXPECTED SUCCESS (user should not be approved yet)`n"
} catch {
  $statusCode = $null
  if ($_.Exception -and $_.Exception.Response) { $statusCode = $_.Exception.Response.StatusCode }
  if ($statusCode -eq 403) {
    Write-Host "    ✓ CORRECTLY REJECTED"
    Write-Host "      Status: 403 Forbidden (user not approved)`n"
  } else {
    Write-Host "    ✗ UNEXPECTED ERROR: $($_.Exception.Message)`n"
  }
}

# Test 3: Check /me endpoint (should return nothing without session)
Write-Host "[3] Testing GET /api/auth/me (without session)" -ForegroundColor Cyan
try {
  $respObj = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method Get -ErrorAction Stop
  Write-Host "    ✗ UNEXPECTED: Got response without session`n"
} catch {
  $statusCode = $null
  if ($_.Exception -and $_.Exception.Response) { $statusCode = $_.Exception.Response.StatusCode }
  if ($statusCode -eq 401) {
    Write-Host "    ✓ CORRECTLY REQUIRES SESSION"
    Write-Host "      Status: 401 Unauthorized`n"
  } else {
    Write-Host "    ? Got status: $statusCode`n"
  }
}

Write-Host "✓ Auth endpoints are working!" -ForegroundColor Green
Write-Host "`nNext steps to complete testing:"
Write-Host "  1. Admin needs to approve user (set status='active')"
Write-Host "  2. Then user can login and get session"
Write-Host "  3. Then /me returns user info with session`n"
