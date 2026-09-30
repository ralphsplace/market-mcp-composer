Set-StrictMode -Version Latest

$script:MarketMcpRepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

function Get-MarketMcpRepoRoot {
    return $script:MarketMcpRepoRoot
}

function Get-InstanceConfig {
    param(
        [string]$Path = (Join-Path $script:MarketMcpRepoRoot 'config\instance.local.json')
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Instance configuration not found: $Path. Run 'npm run instance:init' first."
    }

    try {
        return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json)
    }
    catch {
        throw "Unable to parse instance configuration '$Path': $($_.Exception.Message)"
    }
}

function Get-CloudflareAccessApiToken {
    $token = [Environment]::GetEnvironmentVariable('CLOUDFLARE_ACCESS_API_TOKEN','User')
    if ([string]::IsNullOrWhiteSpace($token)) {
        $token = $env:CLOUDFLARE_ACCESS_API_TOKEN
    }

    if ([string]::IsNullOrWhiteSpace($token)) {
        return $null
    }

    return $token
}

function Invoke-CloudflareApi {
    param(
        [Parameter(Mandatory)][string]$Token,
        [Parameter(Mandatory)][string]$Method,
        [Parameter(Mandatory)][string]$Path,
        [object]$Body = $null
    )

    $params = @{
        Method  = $Method
        Uri     = "https://api.cloudflare.com/client/v4$Path"
        Headers = @{
            Authorization = "Bearer $Token"
            Accept        = 'application/json'
        }
    }

    if ($null -ne $Body) {
        $params.ContentType = 'application/json'
        $params.Body = $Body | ConvertTo-Json -Depth 50
    }

    Invoke-RestMethod @params
}

function Get-ObjectProperty {
    param(
        [object]$Object,
        [Parameter(Mandatory)][string]$Name
    )

    if (
        $null -ne $Object -and
        $null -ne $Object.PSObject.Properties[$Name]
    ) {
        return $Object.$Name
    }

    return $null
}

function Get-McpServerUrl {
    param([Parameter(Mandatory)][object]$InstanceConfig)

    $explicit = [string]$InstanceConfig.mcp.serverUrl
    if (-not [string]::IsNullOrWhiteSpace($explicit)) {
        return $explicit.TrimEnd('/')
    }

    $workerName = [string]$InstanceConfig.cloudflare.workerName
    $subdomain = [string]$InstanceConfig.cloudflare.workersDevSubdomain

    if (
        [string]::IsNullOrWhiteSpace($workerName) -or
        [string]::IsNullOrWhiteSpace($subdomain)
    ) {
        return $null
    }

    return "https://$workerName.$subdomain.workers.dev/mcp"
}

function Get-AccessApplications {
    param(
        [Parameter(Mandatory)][string]$Token,
        [Parameter(Mandatory)][string]$AccountId
    )

    $result = Invoke-CloudflareApi -Token $Token -Method GET -Path "/accounts/$AccountId/access/apps"
    if ($result.success -ne $true) {
        throw 'Cloudflare returned success=false while reading Access applications.'
    }

    return @($result.result)
}

function Get-AccessApplication {
    param(
        [Parameter(Mandatory)][string]$Token,
        [Parameter(Mandatory)][string]$AccountId,
        [Parameter(Mandatory)][string]$ApplicationId
    )

    $result = Invoke-CloudflareApi -Token $Token -Method GET -Path "/accounts/$AccountId/access/apps/$ApplicationId"
    if ($result.success -ne $true) {
        throw 'Cloudflare returned success=false while reading the Access application.'
    }

    return $result.result
}

function Find-AccessApplication {
    param(
        [Parameter(Mandatory)][object[]]$Applications,
        [Parameter(Mandatory)][object]$InstanceConfig
    )

    $configuredId = [string]$InstanceConfig.cloudflare.accessApplicationId
    if (-not [string]::IsNullOrWhiteSpace($configuredId)) {
        $matches = @(
            $Applications | Where-Object {
                [string](Get-ObjectProperty $_ 'id') -eq $configuredId
            }
        )
        if ($matches.Count -eq 1) {
            return $matches[0]
        }
    }

    $workerName = [string]$InstanceConfig.cloudflare.workerName
    if (-not [string]::IsNullOrWhiteSpace($workerName)) {
        $exactNameMatches = @(
            $Applications | Where-Object {
                [string](Get-ObjectProperty $_ 'name') -eq $workerName -or
                [string](Get-ObjectProperty $_ 'name') -eq "$workerName - Cloudflare Workers"
            }
        )
        if ($exactNameMatches.Count -eq 1) {
            return $exactNameMatches[0]
        }

        $containsNameMatches = @(
            $Applications | Where-Object {
                [string](Get-ObjectProperty $_ 'name') -like "*$workerName*"
            }
        )
        if ($containsNameMatches.Count -eq 1) {
            return $containsNameMatches[0]
        }
    }

    return $null
}
