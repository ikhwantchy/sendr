# Rebranding Script: BroBot → Sendr
# Safe and careful text replacement

$ErrorActionPreference = "Stop"

# Define replacements (exact matches only)
$replacements = @{
    "BroBot" = "Sendr"
    "brobot" = "Sendr"
    "BROBOT" = "Sendr"
    "Bro Bot" = "Sendr"
    "bro-bot" = "sendr"
}

# Files to process
$filesToProcess = @(
    "AUTO_DEPLOY_SETUP.md",
    "DEPLOYMENT.md",
    "DEPLOYMENT_TROUBLESHOOTING.md",
    "GOOGLE_SHEETS_STRUCTURE_GUIDE.md",
    "HOW_TO_CREATE_DEADLINE_REMINDER.md",
    "REMINDER_FEATURE_SUMMARY.md",
    "SECURITY_IMPLEMENTATION_PLAN.md",
    "SYSTEM_PROMPT_KAMPUS.md",
    "USER_MANAGEMENT_COMPLETE.md",
    "docs/ADMIN_VS_USER_UI.md",
    "docs/CAMPAIGN_FIX.md",
    "docs/FEATURE_ACCESS_CONTROL.md",
    "docs/FEATURE_STATUS.md",
    "docs/FRONTEND_FOUNDATION_COMPLETE.md",
    "docs/MULTI_USER_ACCESS_PLAN.md",
    "docs/TESTING_GUIDE.md",
    "backend/check-messages.js",
    "backend/test_api_reminders.js",
    "backend/src/api/routes/securityRoutes.ts",
    "frontend/src/components/CreateRuleWizard.tsx",
    "frontend/src/components/Sidebar.tsx",
    "frontend/src/contexts/AdminModeContext.tsx",
    "frontend/src/app/layout.tsx",
    "frontend/src/app/dashboard/page.tsx",
    "frontend/src/app/dashboard/api-keys/page.tsx",
    "frontend/src/components/modals/EditRuleModal.tsx",
    "frontend/src/components/modals/CreateRuleModal.tsx",
    "frontend/src/components/CreateReminderWizard.tsx",
    "frontend/src/app/login/page.tsx"
)

$processedCount = 0
$errorCount = 0

Write-Host "Starting Rebranding: BroBot to Sendr" -ForegroundColor Cyan
Write-Host "Total files to process: $($filesToProcess.Count)" -ForegroundColor Yellow
Write-Host ""

foreach ($file in $filesToProcess) {
    try {
        if (-not (Test-Path $file)) {
            Write-Host "SKIP: $file (not found)" -ForegroundColor Yellow
            continue
        }

        Write-Host "Processing: $file" -ForegroundColor Gray
        
        $content = Get-Content $file -Raw -Encoding UTF8
        $originalContent = $content
        
        foreach ($old in $replacements.Keys) {
            $new = $replacements[$old]
            $content = $content -replace [regex]::Escape($old), $new
        }
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
            Write-Host "  Updated: $file" -ForegroundColor Green
            $processedCount++
        } else {
            Write-Host "  No changes: $file" -ForegroundColor DarkGray
        }
        
    } catch {
        Write-Host "  ERROR: $file - $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "Rebranding Complete!" -ForegroundColor Green
Write-Host "Files processed: $processedCount" -ForegroundColor Yellow
Write-Host "Errors: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
