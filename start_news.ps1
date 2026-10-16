param(
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendRoot = Join-Path $projectRoot 'frontend'
$nextCli = Join-Path $frontendRoot 'node_modules\next\dist\bin\next'
$logsRoot = Join-Path $projectRoot 'logs'
$launcherLog = Join-Path $logsRoot 'news_launcher.log'

function Test-PortInUse {
    param([int]$Port)

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connection = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
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
    param([string]$BaseUrl)

    try {
        # The API can succeed even when compiling the home page fails.
        Invoke-WebRequest -Uri "$BaseUrl/" -UseBasicParsing -TimeoutSec 5 | Out-Null
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/history/dates" -UseBasicParsing -TimeoutSec 3
        $data = $response.Content | ConvertFrom-Json
        return $null -ne $data.PSObject.Properties['dates']
    }
    catch {
        return $false
    }
}

try {
    $url = $null
    $freePort = $null
    foreach ($candidatePort in 3000..3010) {
        $candidateUrl = "http://127.0.0.1:$candidatePort"
        if (Test-PortInUse -Port $candidatePort) {
            if (Test-NewsPage -BaseUrl $candidateUrl) {
                $url = $candidateUrl
                break
            }
        }
        elseif ($null -eq $freePort) {
            $freePort = $candidatePort
        }
    }

    if ($null -eq $url) {
        if ($null -eq $freePort) {
            throw 'No free port was found between 3000 and 3010.'
        }
        $url = "http://127.0.0.1:$freePort"
        if (-not (Test-Path -LiteralPath $nextCli)) {
            throw 'Frontend dependencies are missing. Run npm install in the frontend folder first.'
        }
        New-Item -ItemType Directory -Path $logsRoot -Force | Out-Null
        $node = Get-Command node.exe -ErrorAction Stop
        $stdoutPath = Join-Path $logsRoot 'news_server.stdout.log'
        $stderrPath = Join-Path $logsRoot 'news_server.stderr.log'
        $server = Start-Process -FilePath $node.Source -ArgumentList @('.\node_modules\next\dist\bin\next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', [string]$freePort) -WorkingDirectory $frontendRoot -WindowStyle Minimized -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru

        $ready = $false
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            if (Test-NewsPage -BaseUrl $url) {
                $ready = $true
                break
            }
            if ($server.HasExited) {
                $details = (Get-Content -LiteralPath $stderrPath -Tail 10 -ErrorAction SilentlyContinue) -join [Environment]::NewLine
                throw "The news server exited with code $($server.ExitCode). $details"
            }
            Start-Sleep -Seconds 1
        }
        if (-not $ready) {
            throw 'The news server did not become ready within 60 seconds.'
        }
    }

    $action = 'Ready'
    if (-not $NoBrowser) {
        Start-Process $url
        $action = 'Opened'
    }
    try {
        Add-Content -LiteralPath $launcherLog -Value "$(Get-Date -Format o) $action $url"
    }
    catch {}
}
catch {
    $message = "Could not open News Quick View: $($_.Exception.Message)"
    try {
        Add-Content -LiteralPath $launcherLog -Value "$(Get-Date -Format o) $message"
    }
    catch {}
    Write-Host $message -ForegroundColor Red
    if (-not $NoBrowser) {
        Read-Host 'Press Enter to close this window'
    }
    exit 1
}
