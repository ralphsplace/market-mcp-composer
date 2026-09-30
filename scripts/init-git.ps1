Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
if (Test-Path '.git') { Write-Host 'Git repository already initialized.'; exit 0 }
git init
git add .
Write-Host ''
Write-Host 'Repository initialized and files staged.' -ForegroundColor Green
Write-Host 'Review with: git status; git diff --cached'
Write-Host 'Then commit using your configured Git identity:'
Write-Host "  git commit -m 'baseline: known working FinViz Cloudflare MCP'"
