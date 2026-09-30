Set-StrictMode -Version Latest

function Invoke-HttpProbe {
    param(
        [Parameter(Mandatory)][string]$Uri,
        [string]$Method = 'GET',
        [hashtable]$Headers = @{}
    )

    $request = [System.Net.HttpWebRequest]::Create($Uri)
    $request.Method = $Method
    $request.AllowAutoRedirect = $false
    $request.UserAgent = 'market-mcp-validator/1.0'

    foreach ($key in $Headers.Keys) {
        switch -Regex ($key) {
            '^Accept$' {
                $request.Accept = [string]$Headers[$key]
                continue
            }
            '^Content-Type$' {
                $request.ContentType = [string]$Headers[$key]
                continue
            }
            '^User-Agent$' {
                $request.UserAgent = [string]$Headers[$key]
                continue
            }
            default {
                $request.Headers[$key] = [string]$Headers[$key]
            }
        }
    }

    try {
        $response = $request.GetResponse()
    }
    catch [System.Net.WebException] {
        if ($null -eq $_.Exception.Response) {
            throw
        }
        $response = $_.Exception.Response
    }

    try {
        $headerMap = @{}
        foreach ($name in $response.Headers.AllKeys) {
            $headerMap[$name] = $response.Headers[$name]
        }

        return [PSCustomObject]@{
            StatusCode = [int]$response.StatusCode
            Headers    = $headerMap
        }
    }
    finally {
        $response.Close()
    }
}

function Get-JsonDocument {
    param([Parameter(Mandatory)][string]$Uri)

    Invoke-RestMethod -Method GET -Uri $Uri -Headers @{ Accept = 'application/json' }
}
