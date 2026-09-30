Set-StrictMode -Version Latest

function Get-RequiredCloudflareContext {
    param([string]$ConfigPath = '')
    if ([string]::IsNullOrWhiteSpace($ConfigPath)) { $config = Get-InstanceConfig } else { $config = Get-InstanceConfig -Path $ConfigPath }
    $account = Get-CloudflareAccountId -InstanceConfig $config
    if ($null -eq $account) { throw 'Unable to discover a Cloudflare Account ID.' }
    $token = Get-CloudflareAccessApiToken
    if ([string]::IsNullOrWhiteSpace($token)) { throw 'CLOUDFLARE_ACCESS_API_TOKEN is not configured.' }
    [PSCustomObject]@{ Config = $config; AccountId = $account.Id; Token = $token }
}

function Get-AccessApplicationState {
    param(
        [Parameter(Mandatory)][string]$Token,
        [Parameter(Mandatory)][string]$AccountId,
        [Parameter(Mandatory)][object]$InstanceConfig
    )
    $apps = Get-AccessApplications -Token $Token -AccountId $AccountId
    $summary = Find-AccessApplication -Applications $apps -InstanceConfig $InstanceConfig
    if ($null -eq $summary) { return $null }
    $appId = [string](Get-ObjectProperty $summary 'id')
    if ([string]::IsNullOrWhiteSpace($appId)) { throw 'Matched Access application has no ID.' }
    Get-AccessApplication -Token $Token -AccountId $AccountId -ApplicationId $appId
}

function Get-WorkerHostname {
    param([Parameter(Mandatory)][object]$InstanceConfig)
    $mcpUrl = Get-McpServerUrl -InstanceConfig $InstanceConfig
    if ([string]::IsNullOrWhiteSpace($mcpUrl)) { throw 'Unable to derive the MCP server URL from instance configuration.' }
    $uri = [Uri]$mcpUrl
    if ($uri.Scheme -ne 'https') { throw 'MCP server URL must use HTTPS.' }
    $uri.Host
}

function New-DesiredOAuthConfiguration {
    param(
        [object]$CurrentOAuthConfiguration = $null,
        [string]$AccessTokenLifetime = '15m',
        [string]$SessionDuration = '168h'
    )

    $currentDcr = $null
    $currentGrant = $null
    if ($null -ne $CurrentOAuthConfiguration) {
        $currentDcr = Get-ObjectProperty $CurrentOAuthConfiguration 'dynamic_client_registration'
        $currentGrant = Get-ObjectProperty $CurrentOAuthConfiguration 'grant'
    }

    $allowedUris = @()
    $allowLocalhost = $false
    $allowLoopback = $false

    if ($null -ne $currentDcr) {
        $existingAllowedUris = Get-ObjectProperty $currentDcr 'allowed_uris'
        if ($null -ne $existingAllowedUris) { $allowedUris = @($existingAllowedUris) }

        $existingLocalhost = Get-ObjectProperty $currentDcr 'allow_any_on_localhost'
        if ($null -ne $existingLocalhost) { $allowLocalhost = [bool]$existingLocalhost }

        $existingLoopback = Get-ObjectProperty $currentDcr 'allow_any_on_loopback'
        if ($null -ne $existingLoopback) { $allowLoopback = [bool]$existingLoopback }
    }

    $desiredAccessTokenLifetime = $AccessTokenLifetime
    $desiredSessionDuration = $SessionDuration
    if ($null -ne $currentGrant) {
        $existingAccessTokenLifetime = [string](Get-ObjectProperty $currentGrant 'access_token_lifetime')
        $existingSessionDuration = [string](Get-ObjectProperty $currentGrant 'session_duration')
        if (-not [string]::IsNullOrWhiteSpace($existingAccessTokenLifetime)) { $desiredAccessTokenLifetime = $existingAccessTokenLifetime }
        if (-not [string]::IsNullOrWhiteSpace($existingSessionDuration)) { $desiredSessionDuration = $existingSessionDuration }
    }

    [ordered]@{
        enabled = $true
        dynamic_client_registration = [ordered]@{
            enabled = $true
            allow_any_on_localhost = $allowLocalhost
            allow_any_on_loopback = $allowLoopback
            allowed_uris = $allowedUris
        }
        grant = [ordered]@{
            access_token_lifetime = $desiredAccessTokenLifetime
            session_duration = $desiredSessionDuration
        }
    }
}

function New-AccessApplicationCreateBody {
    param(
        [Parameter(Mandatory)][object]$InstanceConfig,
        [string]$AccessTokenLifetime = '15m',
        [string]$SessionDuration = '168h'
    )

    $workerName = [string]$InstanceConfig.cloudflare.workerName
    if ([string]::IsNullOrWhiteSpace($workerName)) { throw 'cloudflare.workerName is required.' }

    $allowedEmail = [string]$InstanceConfig.cloudflare.allowedEmail
    if ([string]::IsNullOrWhiteSpace($allowedEmail)) { throw 'cloudflare.allowedEmail is required before creating a new Access application.' }

    $hostname = Get-WorkerHostname -InstanceConfig $InstanceConfig
    [ordered]@{
        name = "$workerName - Cloudflare Workers"
        domain = $hostname
        type = 'self_hosted'
        session_duration = '24h'
        oauth_configuration = New-DesiredOAuthConfiguration -AccessTokenLifetime $AccessTokenLifetime -SessionDuration $SessionDuration
        policies = @(
            [ordered]@{
                name = 'Allow configured email'
                decision = 'allow'
                include = @([ordered]@{ email = [ordered]@{ email = $allowedEmail } })
                precedence = 1
            }
        )
    }
}

function New-AccessApplicationRepairBody {
    param(
        [Parameter(Mandatory)][object]$CurrentApplication,
        [string]$AccessTokenLifetime = '15m',
        [string]$SessionDuration = '168h'
    )

    $type = [string](Get-ObjectProperty $CurrentApplication 'type')
    if ([string]::IsNullOrWhiteSpace($type)) { throw 'Current Access application is missing required type.' }

    $body = [ordered]@{
        type = $type
        oauth_configuration = New-DesiredOAuthConfiguration -CurrentOAuthConfiguration (Get-ObjectProperty $CurrentApplication 'oauth_configuration') -AccessTokenLifetime $AccessTokenLifetime -SessionDuration $SessionDuration
    }

    # Cloudflare Worker Access applications may be destination-backed and have
    # no legacy domain field. Preserve whichever target representation the API
    # returned instead of requiring domain.
    foreach ($name in @('domain','self_hosted_domains','name','session_duration','allow_authenticate_via_warp','allowed_idps','app_launcher_visible','auto_redirect_to_identity','cors_headers','custom_deny_message','custom_deny_url','http_only_cookie_attribute','logo_url','options_preflight_bypass','service_auth_401_redirect','skip_interstitial','tags','destinations')) {
        $value = Get-ObjectProperty $CurrentApplication $name
        if ($null -ne $value) { $body[$name] = $value }
    }

    $body
}

function Get-AccessApplicationTargetDescription {
    param([Parameter(Mandatory)][object]$Application)

    $domain = [string](Get-ObjectProperty $Application 'domain')
    if (-not [string]::IsNullOrWhiteSpace($domain)) {
        return "domain=$domain"
    }

    $destinations = Get-ObjectProperty $Application 'destinations'
    if ($null -ne $destinations) {
        $items = @($destinations)
        if ($items.Count -gt 0) {
            $descriptions = @()
            foreach ($destination in $items) {
                $type = [string](Get-ObjectProperty $destination 'type')
                $workerId = [string](Get-ObjectProperty $destination 'worker_id')
                $uri = [string](Get-ObjectProperty $destination 'uri')
                $mcpServerId = [string](Get-ObjectProperty $destination 'mcp_server_id')

                if (-not [string]::IsNullOrWhiteSpace($workerId)) {
                    $descriptions += "$type worker_id=$workerId"
                }
                elseif (-not [string]::IsNullOrWhiteSpace($mcpServerId)) {
                    $descriptions += "$type mcp_server_id=$mcpServerId"
                }
                elseif (-not [string]::IsNullOrWhiteSpace($uri)) {
                    $descriptions += "$type uri=$uri"
                }
                elseif (-not [string]::IsNullOrWhiteSpace($type)) {
                    $descriptions += $type
                }
                else {
                    $descriptions += 'destination'
                }
            }

            return ($descriptions -join '; ')
        }
    }

    $selfHostedDomains = Get-ObjectProperty $Application 'self_hosted_domains'
    if ($null -ne $selfHostedDomains -and @($selfHostedDomains).Count -gt 0) {
        return "self_hosted_domains=$(@($selfHostedDomains) -join ',')"
    }

    return 'target metadata not returned'
}


function Get-OAuthRepairReasons {
    param(
        [Parameter(Mandatory)][object]$CurrentApplication,
        [string]$AccessTokenLifetime = '15m',
        [string]$SessionDuration = '168h'
    )

    $reasons = @()
    $oauth = Get-ObjectProperty $CurrentApplication 'oauth_configuration'

    if ($null -eq $oauth) {
        return @('Managed OAuth configuration is absent')
    }

    if ((Get-ObjectProperty $oauth 'enabled') -ne $true) {
        $reasons += 'Managed OAuth is disabled'
    }

    $dcr = Get-ObjectProperty $oauth 'dynamic_client_registration'
    if ($null -eq $dcr) {
        $reasons += 'Dynamic Client Registration configuration is absent'
    }
    elseif ((Get-ObjectProperty $dcr 'enabled') -ne $true) {
        $reasons += 'Dynamic Client Registration is disabled'
    }

    $grant = Get-ObjectProperty $oauth 'grant'
    if ($null -eq $grant) {
        $reasons += "OAuth grant configuration is absent (defaults would be $AccessTokenLifetime / $SessionDuration)"
    }
    else {
        $accessLifetime = [string](Get-ObjectProperty $grant 'access_token_lifetime')
        $sessionLifetime = [string](Get-ObjectProperty $grant 'session_duration')

        if ([string]::IsNullOrWhiteSpace($accessLifetime)) {
            $reasons += "OAuth access-token lifetime is absent (default would be $AccessTokenLifetime)"
        }

        if ([string]::IsNullOrWhiteSpace($sessionLifetime)) {
            $reasons += "OAuth session duration is absent (default would be $SessionDuration)"
        }
    }

    return @($reasons)
}

function Save-AccessApplicationBackup {
    param([Parameter(Mandatory)][object]$Application)
    $root = Get-MarketMcpRepoRoot
    $backupDir = Join-Path $root '.local-state\backups'
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    $appId = [string](Get-ObjectProperty $Application 'id')
    if ([string]::IsNullOrWhiteSpace($appId)) { $appId = 'unknown' }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $path = Join-Path $backupDir "access-app-$appId-$stamp.json"
    $Application | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $path -Encoding UTF8
    $path
}

function Test-Confirmation {
    param([switch]$Yes,[string]$Prompt = 'Type APPLY to continue')
    if ($Yes) { return $true }
    $answer = Read-Host $Prompt
    ($answer -ceq 'APPLY')
}

function Update-AccessApplicationOAuth {
    param(
        [Parameter(Mandatory)][string]$Token,
        [Parameter(Mandatory)][string]$AccountId,
        [Parameter(Mandatory)][string]$ApplicationId,
        [Parameter(Mandatory)][object]$Body
    )
    $result = Invoke-CloudflareApi -Token $Token -Method PUT -Path "/accounts/$AccountId/access/apps/$ApplicationId" -Body $Body
    if ($result.success -ne $true) { throw 'Cloudflare returned success=false while updating the Access application.' }
    $result.result
}

function Create-AccessApplication {
    param(
        [Parameter(Mandatory)][string]$Token,
        [Parameter(Mandatory)][string]$AccountId,
        [Parameter(Mandatory)][object]$Body
    )
    $result = Invoke-CloudflareApi -Token $Token -Method POST -Path "/accounts/$AccountId/access/apps" -Body $Body
    if ($result.success -ne $true) { throw 'Cloudflare returned success=false while creating the Access application.' }
    $result.result
}
