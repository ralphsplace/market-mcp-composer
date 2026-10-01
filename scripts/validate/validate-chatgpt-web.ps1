Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location $root
try {
    Write-Host '====================================================' -ForegroundColor Cyan
    Write-Host ' ChatGPT Web MCP Preflight' -ForegroundColor Cyan
    Write-Host '====================================================' -ForegroundColor Cyan
    Write-Host 'READ-ONLY: this validates the server contract and production discovery only.'
    Write-Host ''

    & npm run test:mcp-tools
    if ($LASTEXITCODE -ne 0) { throw "MCP tool registry contract failed with exit code $LASTEXITCODE." }

    & npm run validate:all
    if ($LASTEXITCODE -ne 0) { throw "Production validation failed with exit code $LASTEXITCODE." }

    $instancePath = Join-Path $root 'config\instance.local.json'
    if (-not (Test-Path $instancePath)) {
        throw 'Missing config\instance.local.json.'
    }

    $instance = Get-Content $instancePath -Raw | ConvertFrom-Json
    $url = [string]$instance.mcp.serverUrl
    if ([string]::IsNullOrWhiteSpace($url)) {
        $worker = [string]$instance.cloudflare.workerName
        $subdomain = [string]$instance.cloudflare.workersDevSubdomain
        $url = "https://$worker.$subdomain.workers.dev/mcp"
    }

    Write-Host ''
    Write-Host 'CHATGPT WEB PREFLIGHT PASSED' -ForegroundColor Green
    Write-Host "MCP URL: $url"
    Write-Host 'Expected tools after authenticated ChatGPT registration:'
    Write-Host '  finviz_lookup_ticker'
    Write-Host '  get_market_snapshot'
    Write-Host ''
    Write-Host 'Next gate depends on ChatGPT plan:' -ForegroundColor Yellow
    Write-Host '  Pro: register this URL directly in Developer mode for read/fetch testing.' -ForegroundColor Yellow
    Write-Host '  Business/Enterprise/Edu: register it through workspace Developer mode, subject to permissions.' -ForegroundColor Yellow
    Write-Host '  Plus: direct custom remote MCP Developer mode is not currently available; use a different supported path such as ChatGPT Sites.' -ForegroundColor Yellow
    Write-Host 'Do not use a manually uploaded plugin ZIP as proof that ChatGPT web has a live MCP connection.' -ForegroundColor Yellow
}
finally {
    Pop-Location
}
