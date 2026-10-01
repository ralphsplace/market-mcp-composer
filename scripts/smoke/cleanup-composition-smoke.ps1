param(
    [string]$WorkerName = 'market-mcp-composer-smoke'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$configPath = Join-Path $root 'wrangler.smoke.local.jsonc'

if (Test-Path $configPath) {
    Write-Host "Deleting temporary Worker: $WorkerName" -ForegroundColor Cyan
    & npx wrangler delete --name $WorkerName --config $configPath --force
    if ($LASTEXITCODE -ne 0) { throw "Wrangler delete failed with exit code $LASTEXITCODE." }
    Remove-Item $configPath -Force
}

Remove-Item Env:MCP_ACCESS_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:MCP_URL -ErrorAction SilentlyContinue
Remove-Item Env:SMOKE_SYMBOLS -ErrorAction SilentlyContinue

Write-Host 'PASS: temporary smoke deployment state cleaned up.' -ForegroundColor Green
