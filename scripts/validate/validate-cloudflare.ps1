param(
    [string]$ConfigPath = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '..\lib\output.ps1')
. (Join-Path $PSScriptRoot '..\lib\wrangler.ps1')
. (Join-Path $PSScriptRoot '..\lib\cloudflare.ps1')

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Cloudflare Read-Only Validation" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

try {
    Write-Section '1. Instance configuration'
    if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
        $config = Get-InstanceConfig
    }
    else {
        $config = Get-InstanceConfig -Path $ConfigPath
    }

    Write-Pass 'Instance configuration loaded'

    Write-Section '2. Cloudflare account'
    $account = Get-CloudflareAccountId -InstanceConfig $config
    if ($null -eq $account) {
        throw 'Unable to discover a Cloudflare Account ID from Wrangler, instance config, or User environment.'
    }

    Write-Pass 'Cloudflare Account ID discovered'
    Write-Info "Source: $($account.Source)"

    Write-Section '3. Administrative API token'
    $token = Get-CloudflareAccessApiToken
    if ([string]::IsNullOrWhiteSpace($token)) {
        throw 'CLOUDFLARE_ACCESS_API_TOKEN is not configured.'
    }

    $verify = Invoke-CloudflareApi -Token $token -Method GET -Path '/user/tokens/verify'
    if (
        $verify.success -ne $true -or
        [string]$verify.result.status -ne 'active'
    ) {
        throw 'Cloudflare did not report the administrative API token as active.'
    }

    Write-Pass 'Administrative API token is valid and active'

    Write-Section '4. Access application'
    $apps = Get-AccessApplications -Token $token -AccountId $account.Id
    Write-Pass "Access Applications API readable ($($apps.Count) application(s))"

    $summary = Find-AccessApplication -Applications $apps -InstanceConfig $config
    if ($null -eq $summary) {
        throw 'Unable to identify the configured Worker Access application unambiguously.'
    }

    $appId = [string](Get-ObjectProperty $summary 'id')
    $app = Get-AccessApplication -Token $token -AccountId $account.Id -ApplicationId $appId

    Write-Pass "Access application found: $([string](Get-ObjectProperty $app 'name'))"

    Write-Section '5. Managed OAuth / DCR'
    $oauth = Get-ObjectProperty $app 'oauth_configuration'
    if ($null -eq $oauth) {
        throw 'Managed OAuth configuration is absent.'
    }

    if ((Get-ObjectProperty $oauth 'enabled') -ne $true) {
        throw 'Managed OAuth is not enabled.'
    }
    Write-Pass 'Managed OAuth is enabled'

    $dcr = Get-ObjectProperty $oauth 'dynamic_client_registration'
    if ($null -eq $dcr -or (Get-ObjectProperty $dcr 'enabled') -ne $true) {
        throw 'Dynamic Client Registration is not enabled.'
    }
    Write-Pass 'Dynamic Client Registration is enabled'

    $aud = [string](Get-ObjectProperty $app 'aud')
    if ([string]::IsNullOrWhiteSpace($aud)) {
        Write-Warn 'Access application AUD was not returned'
    }
    else {
        Write-Pass 'Access application AUD is present'
    }

    Write-Host ""
    Write-Host 'CLOUDFLARE VALIDATION PASSED' -ForegroundColor Green
    exit 0
}
catch {
    Write-Fail $_.Exception.Message
    Write-Host ""
    Write-Host 'CLOUDFLARE VALIDATION FAILED' -ForegroundColor Red
    exit 1
}
finally {
    if (Get-Variable token -ErrorAction SilentlyContinue) {
        $token = $null
    }
}
