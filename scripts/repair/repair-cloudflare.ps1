param(
    [string]$ConfigPath = '',
    [switch]$Apply,
    [switch]$Yes,
    [string]$AccessTokenLifetime = '15m',
    [string]$SessionDuration = '168h'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '..\lib\output.ps1')
. (Join-Path $PSScriptRoot '..\lib\wrangler.ps1')
. (Join-Path $PSScriptRoot '..\lib\cloudflare.ps1')
. (Join-Path $PSScriptRoot '..\lib\admin.ps1')

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Cloudflare Repair" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

try {
    $ctx = Get-RequiredCloudflareContext -ConfigPath $ConfigPath
    $current = Get-AccessApplicationState -Token $ctx.Token -AccountId $ctx.AccountId -InstanceConfig $ctx.Config

    if ($null -eq $current) {
        throw "No existing Access application matched the instance configuration. Use 'npm run setup:cloudflare' instead."
    }

    $appId = [string](Get-ObjectProperty $current 'id')
    $appName = [string](Get-ObjectProperty $current 'name')
    $currentOauth = Get-ObjectProperty $current 'oauth_configuration'
    $currentDcr = $null
    if ($null -ne $currentOauth) {
        $currentDcr = Get-ObjectProperty $currentOauth 'dynamic_client_registration'
    }

    Write-Section 'Current application'
    Write-Info "Name: $appName"
    Write-Info "ID: $appId"
    Write-Info "Type: $([string](Get-ObjectProperty $current 'type'))"
    Write-Info "Domain: $([string](Get-ObjectProperty $current 'domain'))"
    Write-Info "Managed OAuth enabled: $([string](Get-ObjectProperty $currentOauth 'enabled'))"
    Write-Info "DCR enabled: $([string](Get-ObjectProperty $currentDcr 'enabled'))"

    $allowedUris = @()
    if ($null -ne $currentDcr) {
        $existingUris = Get-ObjectProperty $currentDcr 'allowed_uris'
        if ($null -ne $existingUris) { $allowedUris = @($existingUris) }
    }
    Write-Info "Existing DCR allowed URI count: $($allowedUris.Count)"

    $body = New-AccessApplicationRepairBody -CurrentApplication $current -AccessTokenLifetime $AccessTokenLifetime -SessionDuration $SessionDuration

    Write-Section 'Proposed repair'
    Write-Info 'Managed OAuth -> enabled'
    Write-Info 'Dynamic Client Registration -> enabled'
    Write-Info "DCR allowed URI count -> $($body.oauth_configuration.dynamic_client_registration.allowed_uris.Count) (preserved)"
    Write-Info "allow_any_on_localhost -> $($body.oauth_configuration.dynamic_client_registration.allow_any_on_localhost) (preserved when present)"
    Write-Info "allow_any_on_loopback -> $($body.oauth_configuration.dynamic_client_registration.allow_any_on_loopback) (preserved when present)"
    Write-Info "OAuth access-token lifetime -> $($body.oauth_configuration.grant.access_token_lifetime)"
    Write-Info "OAuth session duration -> $($body.oauth_configuration.grant.session_duration)"

    if (-not $Apply) {
        Write-Warn 'PLAN ONLY. No Cloudflare changes were made.'
        Write-Info 'Re-run with -Apply to write the proposed repair.'
        exit 0
    }

    if (-not (Test-Confirmation -Yes:$Yes -Prompt 'Type APPLY to back up and update the Access application')) {
        Write-Warn 'No changes applied.'
        exit 2
    }

    $backup = Save-AccessApplicationBackup -Application $current
    Write-Pass "Backup written: $backup"

    $updated = Update-AccessApplicationOAuth -Token $ctx.Token -AccountId $ctx.AccountId -ApplicationId $appId -Body $body

    Write-Pass "Access application repaired: $([string](Get-ObjectProperty $updated 'name'))"
    Write-Info 'Run npm run validate:all now.'
    exit 0
}
catch {
    Write-Fail $_.Exception.Message
    exit 1
}
finally {
    if (Get-Variable ctx -ErrorAction SilentlyContinue) {
        $ctx.Token = $null
    }
}
