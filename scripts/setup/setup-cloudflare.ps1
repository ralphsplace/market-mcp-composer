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
Write-Host " Cloudflare Setup" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

try {
    $ctx = Get-RequiredCloudflareContext -ConfigPath $ConfigPath
    Write-Pass "Cloudflare account discovered: $($ctx.AccountId)"
    Write-Pass 'Administrative API token loaded from environment'

    $current = Get-AccessApplicationState -Token $ctx.Token -AccountId $ctx.AccountId -InstanceConfig $ctx.Config

    if ($null -ne $current) {
        Write-Section 'Existing Access application detected'
        Write-Info ([string](Get-ObjectProperty $current 'name'))
        Write-Info 'Setup will not create a duplicate application.'

        $reasons = @(Get-OAuthRepairReasons -CurrentApplication $current -AccessTokenLifetime $AccessTokenLifetime -SessionDuration $SessionDuration)

        if ($reasons.Count -eq 0) {
            Write-Pass 'Existing Access application already satisfies the required Managed OAuth/DCR state.'
            Write-Info 'No setup mutation is required.'
            exit 0
        }

        $body = New-AccessApplicationRepairBody -CurrentApplication $current -AccessTokenLifetime $AccessTokenLifetime -SessionDuration $SessionDuration

        Write-Section 'Proposed setup delta'
        foreach ($reason in $reasons) {
            Write-Info $reason
        }
        Write-Info 'Preserve existing DCR redirect allowlist and localhost/loopback settings'
        Write-Info 'Preserve supported unrelated application fields'

        if (-not $Apply) {
            Write-Warn 'PLAN ONLY. Re-run with -Apply to perform the update.'
            exit 0
        }

        if (-not (Test-Confirmation -Yes:$Yes)) {
            Write-Warn 'No changes applied.'
            exit 2
        }

        $backup = Save-AccessApplicationBackup -Application $current
        Write-Pass "Backup written: $backup"

        $appId = [string](Get-ObjectProperty $current 'id')
        $updated = Update-AccessApplicationOAuth -Token $ctx.Token -AccountId $ctx.AccountId -ApplicationId $appId -Body $body

        Write-Pass "Access application updated: $([string](Get-ObjectProperty $updated 'name'))"
        Write-Info 'Run npm run validate:all next.'
        exit 0
    }

    Write-Section 'No matching Access application found'
    $createBody = New-AccessApplicationCreateBody -InstanceConfig $ctx.Config -AccessTokenLifetime $AccessTokenLifetime -SessionDuration $SessionDuration

    Write-Info "Application: $($createBody.name)"
    Write-Info "Domain: $($createBody.domain)"
    Write-Info "Allowed email: $([string]$ctx.Config.cloudflare.allowedEmail)"
    Write-Info 'Managed OAuth: enabled'
    Write-Info 'DCR: enabled'
    Write-Info 'Localhost/loopback exceptions: disabled'
    Write-Info 'DCR redirect allowlist: empty'

    if (-not $Apply) {
        Write-Warn 'PLAN ONLY. Re-run with -Apply to create the application.'
        exit 0
    }

    if (-not (Test-Confirmation -Yes:$Yes)) {
        Write-Warn 'No changes applied.'
        exit 2
    }

    $created = Create-AccessApplication -Token $ctx.Token -AccountId $ctx.AccountId -Body $createBody

    Write-Pass "Access application created: $([string](Get-ObjectProperty $created 'name'))"
    Write-Info "Application ID: $([string](Get-ObjectProperty $created 'id'))"
    Write-Info "AUD: $([string](Get-ObjectProperty $created 'aud'))"
    Write-Warn 'Copy the returned application ID and AUD into config/instance.local.json, then run npm run instance:render.'
    Write-Info 'Run npm run validate:all after rendering.'
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
