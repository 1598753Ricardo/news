param(
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendRoot = Join-Path $projectRoot 'frontend'
$nextCli = Join-Path $frontendRoot 'node_modules\next\dist\bin\next'
$url = 'http://127.0.0.1:3000'

function Test-PortInUse {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connection = $client.BeginConnect('127.0.0.1', 3000, $null, $null)
        if (-not $connection.AsyncWaitHandle.WaitOne(250)) {
            return $false
        }
        $client.EndConnect($connection)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

function Test-NewsPage {
    try {
        $response = Invoke-WebRequest -Uri "$url/api/history/dates" -UseBasicParsing -TimeoutSec 3
        $data = $response.Content | ConvertFrom-Json
        return $null -ne $data.PSObject.Properties['dates']
    }
    catch {
        return $false
    }
}

try {
    if (Test-PortInUse) {
        if (-not (Test-NewsPage)) {
            throw 'Port 3000 is already used by another application. Close it and try again.'
        }
    }
    else {
        if (-not (Test-Path -LiteralPath $nextCli)) {
            throw 'Frontend dependencies are missing. Run npm install in the frontend folder first.'
        }
        $node = Get-Command node.exe -ErrorAction Stop
        $server = Start-Process -FilePath $node.Source -ArgumentList @('.\node_modules\next\dist\bin\next', 'dev', '--hostname', '127.0.0.1', '--port', '3000') -WorkingDirectory $frontendRoot -WindowStyle Minimized -PassThru

        $ready = $false
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            if (Test-NewsPage) {
                $ready = $true
                break
            }
            if ($server.HasExited) {
                throw "The news server exited with code $($server.ExitCode)."
            }
            Start-Sleep -Seconds 1
        }
        if (-not $ready) {
            throw 'The news server did not become ready within 60 seconds.'
        }
    }

    if (-not $NoBrowser) {
        Start-Process $url
    }
}
catch {
    Write-Host "Could not open News Quick View: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $NoBrowser) {
        Read-Host 'Press Enter to close this window'
    }
    exit 1
}
