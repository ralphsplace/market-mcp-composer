Set-StrictMode -Version Latest

function Get-WranglerWhoAmI {
    try {
        $output = & npx --yes wrangler whoami 2>&1
        if ($LASTEXITCODE -ne 0) {
            return $null
        }

        return ($output -join [Environment]::NewLine)
    }
    catch {
        return $null
    }
}

function Get-CloudflareAccountId {
    param([object]$InstanceConfig = $null)

    $whoami = Get-WranglerWhoAmI
    if ($whoami) {
        foreach ($line in ($whoami -split "\r?\n")) {
            if ($line -match '\b([0-9a-fA-F]{32})\b') {
                return [PSCustomObject]@{
                    Id     = $Matches[1]
                    Source = 'wrangler whoami'
                }
            }
        }
    }

    if (
        $null -ne $InstanceConfig -and
        $null -ne $InstanceConfig.cloudflare -and
        [string]$InstanceConfig.cloudflare.accountId -match '^[0-9a-fA-F]{32}$'
    ) {
        return [PSCustomObject]@{
            Id     = [string]$InstanceConfig.cloudflare.accountId
            Source = 'config/instance.local.json'
        }
    }

    $envId = [Environment]::GetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID','User')
    if ($envId -match '^[0-9a-fA-F]{32}$') {
        return [PSCustomObject]@{
            Id     = $envId
            Source = 'Windows User environment'
        }
    }

    return $null
}
