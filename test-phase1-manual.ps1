# Phase 1 Manual Testing Guide
# Server must be running on http://localhost:5000

Write-Host "`n=== Phase 1 Identity Module - Manual Testing Guide ===" -ForegroundColor Cyan
Write-Host "`nServer should be running at: http://localhost:5000" -ForegroundColor Yellow
Write-Host "Open browser and test the following flows:`n" -ForegroundColor Yellow

Write-Host "1. REGISTRATION (Pending Approval)" -ForegroundColor Green
Write-Host "   → Go to: http://localhost:5000/register"
Write-Host "   → Register a new test user"
Write-Host "   → Check: Should see 'Awaiting admin approval' message"
Write-Host ""

Write-Host "2. LOGIN WITH PENDING ACCOUNT (Should Fail)" -ForegroundColor Green
Write-Host "   → Go to: http://localhost:5000/login"
Write-Host "   → Try to login with the test user"
Write-Host "   → Check: Should see error about pending approval"
Write-Host ""

Write-Host "3. ADMIN LOGIN" -ForegroundColor Green
Write-Host "   → Go to: http://localhost:5000/login"
Write-Host "   → Login with admin account"
$adminEmailDisplay = if ($env:ADMIN_EMAIL) { $env:ADMIN_EMAIL } else { 'admin@vediclms.com' }
Write-Host "   → Email: $adminEmailDisplay"
Write-Host "   → Password: admin123"
Write-Host "   → Check: Should redirect to home/dashboard"
Write-Host ""

Write-Host "4. ADMIN: APPROVE USER" -ForegroundColor Green
Write-Host "   → Go to: http://localhost:5000/manage-users"
Write-Host "   → Find the pending test user"
Write-Host "   → Click 'Approve'"
Write-Host "   → Check: User status changes to 'active', role becomes 'student'"
Write-Host ""

Write-Host "5. LOGIN WITH APPROVED ACCOUNT (Should Work)" -ForegroundColor Green
Write-Host "   → Logout from admin"
Write-Host "   → Go to: http://localhost:5000/login"
Write-Host "   → Login with approved test user"
Write-Host "   → Check: Should successfully login and see content"
Write-Host ""

Write-Host "6. CHAPTER EDITOR (Verify Still Works)" -ForegroundColor Green
Write-Host "   → As admin, go to: http://localhost:5000/manage"
Write-Host "   → Create/open a chapter"
Write-Host "   → Check: Chapter editor loads without errors"
Write-Host "   → Try editing content, creating segments"
Write-Host "   → Check: Everything works as before Phase 1"
Write-Host ""

Write-Host "✨ If all the above work, Phase 1 is successful!`n" -ForegroundColor Cyan

# Quick API test via curl
Write-Host "`n=== Quick API Tests (Alternative) ===" -ForegroundColor Magenta
Write-Host "`nTest 1: GET /api/auth/me (should return 401 when not logged in)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/me" -Method GET -UseBasicParsing
    Write-Host "Response: $($response.StatusCode) - $($response.Content)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode.Value__ -eq 401) {
        Write-Host "✓ Correctly returned 401 Unauthorized" -ForegroundColor Green
    } else {
        Write-Host "✗ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nTest 2: POST /api/auth/register (create new user)" -ForegroundColor Yellow
try {
    $testEmail = "quicktest-$(Get-Random)@vediclms.com"
    $body = @{
        email = $testEmail
        password = "Test123!"
        firstName = "Quick"
        lastName = "Test"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✓ User registered: $($data.userId)" -ForegroundColor Green
    Write-Host "  Status: $($data.status)" -ForegroundColor Gray
    Write-Host "  Message: $($data.message)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Browser Testing Recommended ===" -ForegroundColor Cyan
Write-Host "Open http://localhost:5000 in your browser for full testing`n" -ForegroundColor Yellow
