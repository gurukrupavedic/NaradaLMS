# Phase 0 Completion Script
# Automates the remaining localStorage → cookie migration

$filesToUpdate = @(
    "client\src\features\student\pages\LearnChapterPage.tsx",
    "client\src\features\student\hooks\useMyDetails.ts",
    "client\src\features\content\context\ChapterEditorContext.tsx",
    "client\src\features\content\hooks\useAudioManagement.ts",
    "client\src\features\instructor\hooks\useTrackProgress.ts",
    "client\src\features\instructor\hooks\useStudentDetails.ts",
    "client\src\features\instructor\hooks\useMyStudents.ts",
    "client\src\features\instructor\hooks\useInstructorBatches.ts",
    "client\src\features\batches\hooks\useUpdateProficiency.ts",
    "client\src\features\admin\hooks\useAuditLogs.ts"
)

Write-Host "🔄 Starting localStorage → apiClient migration..." -ForegroundColor Cyan

foreach ($file in $filesToUpdate) {
    $filePath = Join-Path $PSScriptRoot ".." $file
    
    if (Test-Path $filePath) {
        Write-Host "  Processing: $file" -ForegroundColor Yellow
        
        $content = Get-Content $filePath -Raw
        
        # Add import if not present
        if ($content -notmatch "import.*apiRequest.*from.*@/lib/apiClient") {
            $content = $content -replace "(import.*from.*@tanstack/react-query';)", "`$1`nimport { apiRequest } from '@/lib/apiClient';"
        }
        
        # Replace fetch calls
        $content = $content -replace "const token = localStorage\.getItem\('jwt_token'\);", ""
        $content = $content -replace "'Authorization': ``Bearer \$\{token\}``", ""
        $content = $content -replace "const response = await fetch\(", "const response = await apiRequest("
        $content = $content -replace "headers:\s*\{[^}]*\},?", ""
        
        # Cleanup extra whitespace
        $content = $content -replace "\r\n\r\n\r\n", "`r`n`r`n"
        
        Set-Content $filePath $content -NoNewline
        Write-Host "    ✓ Updated" -ForegroundColor Green
    } else {
        Write-Host "    ✗ File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`n✅ Migration complete! Run 'git add -A && git commit -m ""chore: complete localStorage migration""' to commit" -ForegroundColor Green
