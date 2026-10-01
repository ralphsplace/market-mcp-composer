param(
    [string]$WorkerName = 'market-mcp-composer-smoke',
    [string]$Symbols = 'MSFT,SPY'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$configPath = Join-Path $root 'wrangler.smoke.local.jsonc'
$entryPoint = (Resolve-Path (Join-Path $root 'src\index.ts')).Path

$config = @"
{
  "name": "$WorkerName",
  "main": "$($entryPoint.Replace('\','\\'))",
  "compatibility_date": "2026-09-01",
  "workers_dev": true,
  "preview_urls": false,
  "vars": {
    "AUTH_MODE": "bearer",
    "DATA_MODE": "fixture",
    "ENABLED_PROVIDERS": "finviz,yahoo"
  }
}
"@

Set-Content -Path $configPath -Value $config -Encoding UTF8

Write-Host "Deploying temporary smoke Worker: $WorkerName" -ForegroundColor Cyan
& npx wrangler deploy --config $configPath
if ($LASTEXITCODE -ne 0) { throw "Wrangler deploy failed with exit code $LASTEXITCODE." }

$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $rng.GetBytes($bytes)
}
finally {
    $rng.Dispose()
}

$token = [Convert]::ToBase64String($bytes)
$env:MCP_ACCESS_TOKEN = $token

Write-Host "Installing temporary bearer token..." -ForegroundColor Cyan
$token | & npx wrangler secret put MCP_ACCESS_TOKEN --config $configPath
if ($LASTEXITCODE -ne 0) { throw "Wrangler secret put failed with exit code $LASTEXITCODE." }

$instancePath = Join-Path $root 'config\instance.local.json'
if (-not (Test-Path $instancePath)) {
    throw 'Missing config\instance.local.json. Run npm run instance:init and configure the Workers.dev subdomain first.'
}

$instance = Get-Content $instancePath -Raw | ConvertFrom-Json
$subdomain = [string]$instance.cloudflare.workersDevSubdomain
if ([string]::IsNullOrWhiteSpace($subdomain)) {
    throw 'Missing cloudflare.workersDevSubdomain in config\instance.local.json.'
}

$env:MCP_URL = "https://$WorkerName.$subdomain.workers.dev/mcp"
$env:SMOKE_SYMBOLS = $Symbols

Write-Host "PASS: temporary smoke deployment ready." -ForegroundColor Green
Write-Host "  MCP_URL=$env:MCP_URL"
Write-Host "  SMOKE_SYMBOLS=$env:SMOKE_SYMBOLS"
Write-Host "  MCP_ACCESS_TOKEN is set in this PowerShell process and was not printed."
Write-Host ''
Write-Host 'Running composition smoke test in the same PowerShell process...' -ForegroundColor Cyan
Push-Location $root
try {
    & node scripts/smoke/smoke-composition.mjs
    if ($LASTEXITCODE -ne 0) { throw "Composition smoke test failed with exit code $LASTEXITCODE." }
}
finally {
    Pop-Location
}

Write-Host 'PASS: composition smoke test completed.' -ForegroundColor Green
Write-Host ''
Write-Host 'Cleanup command:' -ForegroundColor Cyan
Write-Host '  npm run smoke:composition:cleanup'
