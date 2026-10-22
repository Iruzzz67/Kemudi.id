$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$apiDirectory = Join-Path $projectRoot 'src/Kemudi.Api'
$webDirectory = Join-Path $projectRoot 'src/Kemudi.Web'
$logDirectory = Join-Path $projectRoot '.artifacts/start'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

function Test-LocalService([string]$url) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch { return $false }
}

function Start-LocalService([string]$name, [string]$directory, [string]$url, [string]$checkUrl) {
    if (Test-LocalService $checkUrl) {
        Write-Host "$name sudah berjalan di $url"
        return
    }
    if (-not (Test-Path -LiteralPath $directory)) { throw "Folder $name tidak ditemukan: $directory" }
    $process = Start-Process -FilePath 'dotnet' -ArgumentList @('run', '--no-launch-profile', '--urls', $url) `
        -WorkingDirectory $directory -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $logDirectory "$name.out.log") `
        -RedirectStandardError (Join-Path $logDirectory "$name.err.log")
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        if (Test-LocalService $checkUrl) {
            Write-Host "$name siap di $url (PID $($process.Id))"
            return
        }
        if ($process.HasExited) { throw "$name berhenti saat start. Lihat .artifacts/start/$name.err.log" }
        Start-Sleep -Seconds 1
    }
    throw "$name belum siap setelah 60 detik. Lihat .artifacts/start/$name.err.log"
}

Start-LocalService 'API' $apiDirectory 'http://127.0.0.1:5077' 'http://127.0.0.1:5077/api/vehicles'
Start-LocalService 'Web' $webDirectory 'http://127.0.0.1:5259' 'http://127.0.0.1:5259/login'
Write-Host 'Login: http://127.0.0.1:5259/login'
