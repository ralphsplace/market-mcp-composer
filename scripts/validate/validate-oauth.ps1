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
Write-Host " OAuth Discovery Validation" -ForegroundColor Cyan
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

    if ($mcpUrl -notmatch '^https://') {
        throw 'MCP server URL must use HTTPS.'
    }

    Write-Section '1. Anonymous MCP challenge'
    $probe = Invoke-HttpProbe -Uri $mcpUrl -Method GET
    Write-Info "HTTP status: $($probe.StatusCode)"

    if ($probe.StatusCode -ne 401) {
        throw "Expected anonymous MCP request to return HTTP 401; received $($probe.StatusCode)."
    }

    $challenge = $probe.Headers['WWW-Authenticate']
    if ([string]::IsNullOrWhiteSpace($challenge)) {
        throw 'WWW-Authenticate was not returned.'
    }

    Write-Pass 'Anonymous MCP request returns OAuth challenge'

    Write-Section '2. Protected Resource Metadata'
    $mcpUri = [Uri]$mcpUrl
    $origin = "$($mcpUri.Scheme)://$($mcpUri.Authority)"

    $metadataCandidates = New-Object System.Collections.Generic.List[string]
    $metadataCandidates.Add("$origin/.well-known/oauth-protected-resource")

    if ($challenge -match 'resource_metadata="([^"]+)"') {
        $advertised = $Matches[1]
        if (-not $metadataCandidates.Contains($advertised)) {
            $metadataCandidates.Add($advertised)
        }
    }

    $resourceMetadata = $null
    $resourceMetadataUri = $null

    foreach ($candidate in $metadataCandidates) {
        try {
            $resourceMetadata = Get-JsonDocument -Uri $candidate
            $resourceMetadataUri = $candidate
            break
        }
        catch {
            Write-Info "Not available: $candidate"
        }
    }

    if ($null -eq $resourceMetadata) {
        throw 'Unable to retrieve OAuth Protected Resource Metadata.'
    }

    Write-Pass 'Protected Resource Metadata discovered'
    Write-Info $resourceMetadataUri

    $authorizationServers = @(
        Get-ObjectProperty $resourceMetadata 'authorization_servers'
    )

    if ($authorizationServers.Count -eq 0) {
        throw 'Protected Resource Metadata did not advertise authorization_servers.'
    }

    Write-Pass 'Authorization server advertised'

    Write-Section '3. Authorization Server Metadata'
    $authorizationServer = ([string]$authorizationServers[0]).TrimEnd('/')
    $metadataUri = "$authorizationServer/.well-known/oauth-authorization-server"
    $serverMetadata = Get-JsonDocument -Uri $metadataUri

    foreach ($field in @(
        'authorization_endpoint',
        'token_endpoint',
        'registration_endpoint'
    )) {
        $value = [string](Get-ObjectProperty $serverMetadata $field)
        if ([string]::IsNullOrWhiteSpace($value)) {
            throw "Authorization server metadata is missing '$field'."
        }

        Write-Pass "$field advertised"
        Write-Info $value
    }

    $pkce = @(
        Get-ObjectProperty $serverMetadata 'code_challenge_methods_supported'
    )

    if ($pkce.Count -gt 0) {
        if ($pkce -contains 'S256') {
            Write-Pass 'PKCE S256 is supported'
        }
        else {
            Write-Warn 'PKCE methods are advertised but S256 is absent'
        }
    }
    else {
        Write-Warn 'Authorization server did not advertise PKCE methods'
    }

    Write-Host ""
    Write-Host 'OAUTH VALIDATION PASSED' -ForegroundColor Green
    exit 0
}
catch {
    Write-Fail $_.Exception.Message
    Write-Host ""
    Write-Host 'OAUTH VALIDATION FAILED' -ForegroundColor Red
    exit 1
}
