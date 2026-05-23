Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "   Daire Ops Kurulum Sihirbazi" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$airtableToken  = Read-Host "Airtable Token (pat... ile baslar)"
$telegramToken  = Read-Host "Telegram Bot Token  (123456:AAH... ile baslar)"
$openaiKey      = Read-Host "OpenAI API Key      (bos birakabilirsin, Enter'a bas)"

$envPath = Join-Path $PSScriptRoot ".env"

$content = "AIRTABLE_TOKEN=$airtableToken`r`nAIRTABLE_BASE_ID=appc7SZojZt50Hv7v`r`nTELEGRAM_BOT_TOKEN=$telegramToken`r`nTELEGRAM_CHAT_ID=6248901684`r`nOPENAI_API_KEY=$openaiKey"

[System.IO.File]::WriteAllText($envPath, $content, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "✓ .env dosyasi olusturuldu!" -ForegroundColor Green
Write-Host ""
Write-Host "Simdi sunucuyu baslatiyorum..." -ForegroundColor Yellow
Write-Host ""

Set-Location $PSScriptRoot
npm run dev
