param(
    [string]$ConfigPath = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '..\lib\output.ps1')
. (Join-Path $PSScriptRoot '..\lib\cloudflare.ps1')
. (Join-Path $PSScriptRoot '..\lib\http.ps1')

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " MCP Endpoint Validation" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

try {
    if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
        $config = Get-InstanceConfig
    }
    else {
        $config = Get-InstanceConfig -Path $ConfigPath
    }

    $mcpUrl = Get-McpServerUrl -InstanceConfig $config
    if ([string]::IsNullOrWhiteSpace($mcpUrl)) {
        throw 'Unable to derive mcp.serverUrl from instance configuration.'
    }

    $uri = [Uri]$mcpUrl
    if ($uri.Scheme -ne 'https') {
        throw 'MCP server URL must use HTTPS.'
    }

    if (-not $uri.AbsolutePath.EndsWith('/mcp')) {
        Write-Warn "MCP URL path is '$($uri.AbsolutePath)' rather than ending in /mcp"
    }
    else {
        Write-Pass 'MCP URL uses the expected /mcp path'
    }

    Write-Section '1. Public endpoint behavior'
    $probe = Invoke-HttpProbe -Uri $mcpUrl -Method GET
    Write-Info "HTTP status: $($probe.StatusCode)"

    if ($probe.StatusCode -ne 401) {
        throw "Expected the protected MCP endpoint to return HTTP 401 anonymously; received $($probe.StatusCode)."
    }

    if ([string]::IsNullOrWhiteSpace($probe.Headers['WWW-Authenticate'])) {
        throw 'Protected MCP endpoint did not advertise WWW-Authenticate.'
    }

    Write-Pass 'Protected MCP endpoint is reachable and requires authentication'

    Write-Section '2. Authenticated protocol smoke test'
    Write-Info 'Skipped by design: OAuth user authentication is completed by ChatGPT.'
    Write-Info 'Use the connected ChatGPT MCP to verify tools/list and finviz_lookup_ticker.'

    Write-Host ""
    Write-Host 'MCP ENDPOINT VALIDATION PASSED' -ForegroundColor Green
    exit 0
}
catch {
    Write-Fail $_.Exception.Message
    Write-Host ""
    Write-Host 'MCP ENDPOINT VALIDATION FAILED' -ForegroundColor Red
    exit 1
}
