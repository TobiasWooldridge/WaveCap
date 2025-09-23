[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$RemainingArgs
)

$ErrorActionPreference = 'Stop'

$FixtureSet = $null
for ($i = 0; $i -lt $RemainingArgs.Count; $i++) {
    $arg = $RemainingArgs[$i]
    switch -Regex ($arg) {
        '^--screenshot-fixtures$' {
            $FixtureSet = 'screenshot'
            continue
        }
        '^--fixture-set$' {
            if ($i + 1 -ge $RemainingArgs.Count) {
                Write-Error '--fixture-set requires a value'
                exit 1
            }
            $FixtureSet = $RemainingArgs[$i + 1]
            $i++
            continue
        }
        '^--fixture-set=(.+)$' {
            $FixtureSet = $Matches[1]
            continue
        }
        default {
            Write-Error "Unknown argument: $arg"
            exit 1
        }
    }
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) {
    $ScriptDir = (Get-Location).ProviderPath
}

$RootDir = [System.IO.Path]::GetFullPath($ScriptDir)
$BackendDir = Join-Path $RootDir 'backend'
$FrontendDir = Join-Path $RootDir 'frontend'
$VenvDir = Join-Path $BackendDir '.venv'

Push-Location $RootDir
try {
    Write-Host 'Starting Multi-Stream WaveCap Application...'
    Write-Host ''

    Write-Host 'Setting up Python environment...'
    if (-not (Test-Path $VenvDir)) {
        python -m venv $VenvDir
    }

    $ActivateScript = Join-Path (Join-Path $VenvDir 'Scripts') 'Activate.ps1'
    if (-not (Test-Path $ActivateScript)) {
        Write-Error "Virtual environment activation script not found at $ActivateScript"
        exit 1
    }

    . $ActivateScript

    Push-Location $BackendDir
    try {
        python -m pip install --upgrade pip | Out-Null
        python -m pip install -e .
    }
    finally {
        Pop-Location
    }

    Write-Host ''

    Write-Host 'Installing frontend dependencies...'
    Push-Location $FrontendDir
    try {
        npm install
    }
    finally {
        Pop-Location
    }

    Write-Host ''

    Write-Host 'Building frontend bundle...'
    Push-Location $FrontendDir
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Error 'Frontend build failed. Aborting.'
            exit $LASTEXITCODE
        }
    }
    finally {
        Pop-Location
    }

    Write-Host ''

    $HostValue = (python -c "from wavecap_backend.config import load_config; print(load_config().server.host)").Trim()
    $PortValue = (python -c "from wavecap_backend.config import load_config; print(load_config().server.port)").Trim()

    if ($FixtureSet) {
        $env:WAVECAP_FIXTURES = $FixtureSet
        Write-Host "Loading fixture set '$FixtureSet' before launch (existing state will be replaced)..."
        Write-Host ''
    }

    Write-Host "Launching backend server on ${HostValue}:${PortValue}..."
    & uvicorn wavecap_backend.server:create_app --factory --host $HostValue --port $PortValue
}
finally {
    Pop-Location
}
