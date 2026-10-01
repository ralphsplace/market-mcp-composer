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
$chatgptProperty = $config.PSObject.Properties['chatgpt']
$appId = ''
if ($null -ne $chatgptProperty -and $null -ne $chatgptProperty.Value) {
    $appIdProperty = $chatgptProperty.Value.PSObject.Properties['appId']
    if ($null -ne $appIdProperty) {
        $appId = [string]$appIdProperty.Value
    }
}
if ([string]::IsNullOrWhiteSpace($appId)) {
    throw 'Missing chatgpt.appId in config\\instance.local.json. Create or refresh the ChatGPT MCP app first, then copy its technical app ID into chatgpt.appId.'
}
if ($appId -notmatch '^(plugin_asdk_app_|asdk_app_|connector_|templated_apps_)[A-Za-z0-9_-]+$') {
    throw 'chatgpt.appId must be a ChatGPT app ID beginning with plugin_asdk_app_, asdk_app_, connector_, or templated_apps_.'
}
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
$app = [ordered]@{
    apps = [ordered]@{
        'market-mcp-composer' = [ordered]@{
            id = $appId
            required = $true
        }
    }
}
$app | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $stage '.app.json') -Encoding UTF8
Copy-Item (Join-Path $root 'skills') $stage -Recurse
Copy-Item (Join-Path $root 'PLUGIN_UPLOAD.md') $stage
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal
Remove-Item $stage -Recurse -Force
$hash = Get-FileHash $zip -Algorithm SHA256
$hash.Hash | Set-Content "$zip.sha256.txt" -Encoding ASCII
Write-Host 'PASS: Plugin archive created' -ForegroundColor Green
Write-Host "  $zip"
Write-Host "ChatGPT app ID: $appId"
Write-Host "SHA256: $($hash.Hash)"
