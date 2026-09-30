Set-StrictMode -Version Latest

function Write-Section {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host ""
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Pass {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host "PASS: $Message" -ForegroundColor Green
}

function Write-Warn {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host "WARN: $Message" -ForegroundColor Yellow
}

function Write-Fail {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host "FAIL: $Message" -ForegroundColor Red
}

function Write-Info {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host "INFO: $Message" -ForegroundColor Gray
}
