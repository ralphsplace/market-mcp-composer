param(
    [string]$ConfigPath = 'config\instance.local.json',
    [string]$OutputPath = 'wrangler.chatgpt.local.jsonc'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$configFile = Join-Path $root $ConfigPath
$outFile = Join-Path $root $OutputPath
if (-not (Test-Path $configFile)) {
    throw "Missing $ConfigPath. Run npm run instance:init first."
}
$c = Get-Content $configFile -Raw | ConvertFrom-Json
function Need([object]$value, [string]$name) {
    if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value)) { throw "Missing instance value: $name" }
    return [string]$value
}
$workerName = Need $c.cloudflare.workerName 'cloudflare.workerName'
$teamDomain = Need $c.cloudflare.teamDomain 'cloudflare.teamDomain'
$aud = Need $c.cloudflare.accessAud 'cloudflare.accessAud'
$email = Need $c.cloudflare.allowedEmail 'cloudflare.allowedEmail'
if ($teamDomain -notmatch '^https://[^/]+\.cloudflareaccess\.com/?$') { throw 'cloudflare.teamDomain must be an https://*.cloudflareaccess.com URL.' }
$doc = [ordered]@{
    name = $workerName
    main = 'src/index.ts'
    compatibility_date = '2026-09-01'
    workers_dev = $true
    preview_urls = $false
    vars = [ordered]@{
        AUTH_MODE = 'access'
        DATA_MODE = 'export'
        ENABLED_PROVIDERS = 'finviz'
        ALLOWED_EMAIL = $email
        TEAM_DOMAIN = $teamDomain.TrimEnd('/')
        POLICY_AUD = $aud
    }
}
$doc | ConvertTo-Json -Depth 10 | Set-Content $outFile -Encoding UTF8
Write-Host 'PASS: Generated ignored Wrangler deployment config.' -ForegroundColor Green
Write-Host "  $outFile"
