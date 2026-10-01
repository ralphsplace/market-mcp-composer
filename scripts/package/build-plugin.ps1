param(
    [string]$OutputDirectory = 'dist',
    [string]$ConfigPath = 'config\instance.local.json'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$configFile = Join-Path $root $ConfigPath
if (-not (Test-Path $configFile)) { throw "Missing $ConfigPath. Run npm run instance:init and configure the deployment first." }
$config = Get-Content $configFile -Raw | ConvertFrom-Json
$url = [string]$config.mcp.serverUrl
if ([string]::IsNullOrWhiteSpace($url)) {
    $worker = [string]$config.cloudflare.workerName
    $subdomain = [string]$config.cloudflare.workersDevSubdomain
    if ($worker -and $subdomain) { $url = "https://$worker.$subdomain.workers.dev/mcp" }
}
if ($url -notmatch '^https://[^/]+(?:/.*)?/mcp/?$') { throw 'Set mcp.serverUrl to an HTTPS URL ending in /mcp, or set cloudflare.workerName + workersDevSubdomain.' }
$plugin = Get-Content (Join-Path $root 'plugin.json') -Raw | ConvertFrom-Json
$version = [string]$plugin.version
$name = [string]$plugin.name
if (-not $name -or -not $version) { throw 'plugin.json must contain name and version.' }
$outDir = Join-Path $root $OutputDirectory
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$stage = Join-Path $outDir "$name-$version"
$zip = Join-Path $outDir "$name-$version.zip"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $zip -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $stage -Force | Out-Null
Copy-Item (Join-Path $root 'plugin.json') $stage
$mcp = [ordered]@{
    '$schema' = 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json'
    mcpServers = [ordered]@{
        'market-mcp-composer' = [ordered]@{
            type = 'streamable-http'
            url = $url.TrimEnd('/')
        }
    }
}
$mcp | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $stage 'mcp.json') -Encoding UTF8
Copy-Item (Join-Path $root 'skills') $stage -Recurse
Copy-Item (Join-Path $root 'PLUGIN_UPLOAD.md') $stage
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal
Remove-Item $stage -Recurse -Force
$hash = Get-FileHash $zip -Algorithm SHA256
$hash.Hash | Set-Content "$zip.sha256.txt" -Encoding ASCII
Write-Host 'PASS: Portable plugin archive created' -ForegroundColor Green
Write-Host "  $zip"
Write-Host "MCP URL: $url"
Write-Host "SHA256: $($hash.Hash)"
Write-Host ""
Write-Host "IMPORTANT: This ZIP is a portable/Codex/Desktop/public-submission artifact." -ForegroundColor Yellow
Write-Host "For ChatGPT web development, register the production /mcp URL directly in Developer mode first." -ForegroundColor Yellow
