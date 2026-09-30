param([string]$ConfigPath = 'config\instance.local.json')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$file = Join-Path $root $ConfigPath
if (-not (Test-Path $file)) { throw "Missing $ConfigPath. Run npm run instance:init first." }
$c = Get-Content $file -Raw | ConvertFrom-Json
$url = [string]$c.mcp.serverUrl
if ([string]::IsNullOrWhiteSpace($url)) {
    $worker=[string]$c.cloudflare.workerName
    $sub=[string]$c.cloudflare.workersDevSubdomain
    if (-not [string]::IsNullOrWhiteSpace($worker) -and -not [string]::IsNullOrWhiteSpace($sub)) {
        $url = "https://$worker.$sub.workers.dev/mcp"
    }
}
Write-Host 'Instance configuration' -ForegroundColor Cyan
Write-Host "  Worker:      $($c.cloudflare.workerName)"
Write-Host "  MCP URL:     $url"
Write-Host "  Team domain: $($c.cloudflare.teamDomain)"
Write-Host "  Access app:  $($c.cloudflare.accessApplicationId)"
Write-Host "  Account ID:  $($c.cloudflare.accountId)"
Write-Host '  Secrets:     not stored in this file'
