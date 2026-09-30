param(
    [string]$ConfigPath = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '..\lib\output.ps1')

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Market MCP Production Validation" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "READ-ONLY: this command does not modify Cloudflare or deploy code."

$validators = @(
    'validate-cloudflare.ps1',
    'validate-oauth.ps1',
    'validate-mcp.ps1'
)

$failed = @()

foreach ($validator in $validators) {
    $path = Join-Path $PSScriptRoot $validator
    $arguments = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', $path
    )

    if (-not [string]::IsNullOrWhiteSpace($ConfigPath)) {
        $arguments += @('-ConfigPath', $ConfigPath)
    }

    & powershell.exe @arguments
    if ($LASTEXITCODE -ne 0) {
        $failed += $validator
    }
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan

if ($failed.Count -eq 0) {
    Write-Host 'VALIDATION PASSED - READY FOR CLIENT TESTING' -ForegroundColor Green
    exit 0
}

Write-Host 'VALIDATION FAILED' -ForegroundColor Red
foreach ($validator in $failed) {
    Write-Host "  $validator" -ForegroundColor Red
}

exit 1
