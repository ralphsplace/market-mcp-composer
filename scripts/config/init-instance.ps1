param(
    [string]$ConfigPath = 'config\instance.local.json'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$target = Join-Path $root $ConfigPath
$example = Join-Path $root 'config\instance.example.json'
if (Test-Path $target) {
    Write-Host "INFO: Instance config already exists:" -ForegroundColor Cyan
    Write-Host "  $target"
    exit 0
}
New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
Copy-Item $example $target
Write-Host 'PASS: Created ignored per-instance configuration.' -ForegroundColor Green
Write-Host "  $target"
Write-Host ''
Write-Host 'Edit this one file with values for the target Cloudflare deployment.'
Write-Host 'Do NOT put API tokens, FinViz credentials, passwords, or client secrets in it.'
