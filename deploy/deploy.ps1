<#
.SYNOPSIS
    Builds and atomically deploys GOD Mode to godmode.vaneev.com over explicit FTPS.

.DESCRIPTION
    Uploads an immutable static export into /.godmode/releases/<release-id>/ and
    switches the root .htaccess pointer with one server-side rename. The previous
    pointer is retained at /.godmode/rollback.htaccess. Failed post-deploy smoke
    tests automatically restore the previous pointer.

.EXAMPLE
    .\deploy\deploy.ps1 -DryRun

.EXAMPLE
    .\deploy\deploy.ps1

.EXAMPLE
    .\deploy\deploy.ps1 -Rollback
#>
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Rollback,
    [switch]$SkipBuild,

    [ValidateSet('ftpes', 'ftp')]
    [string]$Protocol = 'ftpes',

    [switch]$AcceptAnyCertificate,
    [string]$SiteUrl = 'https://godmode.vaneev.com'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ($DryRun -and $Rollback) {
    throw '-DryRun and -Rollback cannot be used together.'
}

$DeployDir = $PSScriptRoot
$RepoRoot = Split-Path -Parent $DeployDir
$OutDir = Join-Path $RepoRoot 'out'
$CredFile = Join-Path $DeployDir 'credentials.ps1'
$LogFile = Join-Path $DeployDir 'deploy.log'
$TempDir = Join-Path ([IO.Path]::GetTempPath()) ("godmode-deploy-" + [guid]::NewGuid().ToString('N'))

function Quote-WinScp([string]$Value) {
    return '"' + $Value.Replace('"', '""') + '"'
}

function Find-WinScp {
    $candidates = @(
        (Join-Path $DeployDir 'tools\winscp\WinSCP.com'),
        'C:\Program Files (x86)\WinSCP\WinSCP.com',
        'C:\Program Files\WinSCP\WinSCP.com',
        "$env:LOCALAPPDATA\Programs\WinSCP\WinSCP.com"
    )
    $found = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($found) { return $found }

    $command = Get-Command 'WinSCP.com' -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }

    throw 'WinSCP.com was not found. See DEPLOY.md for installation instructions.'
}

function Invoke-WinScp {
    param(
        [Parameter(Mandatory)] [string[]]$Commands,
        [switch]$ContinueOnError
    )

    $scriptPath = Join-Path $TempDir ("winscp-" + [guid]::NewGuid().ToString('N') + '.txt')
    $batchMode = if ($ContinueOnError) { 'continue' } else { 'abort' }
    $lines = @(
        "option batch $batchMode",
        'option confirm off',
        $script:OpenCommand
    ) + $Commands + @('exit')

    [IO.File]::WriteAllLines($scriptPath, $lines, [Text.UTF8Encoding]::new($false))
    try {
        & $script:WinScp /ini=nul /log="$LogFile" /loglevel=0 /script="$scriptPath"
        $code = $LASTEXITCODE
    } finally {
        Remove-Item -LiteralPath $scriptPath -Force -ErrorAction SilentlyContinue
    }

    if (-not $ContinueOnError -and $code -ne 0) {
        throw "WinSCP failed with exit code $code. See $LogFile"
    }
    return $code
}

function Write-Utf8File([string]$Path, [string]$Content) {
    [IO.File]::WriteAllText($Path, $Content, [Text.UTF8Encoding]::new($false))
}

function Publish-Pointer([string]$LocalPointer, [string]$Suffix) {
    $remoteTemporary = "/.htaccess.$Suffix.tmp"
    Invoke-WinScp -Commands @(
        "put -transfer=ascii $(Quote-WinScp $LocalPointer) $(Quote-WinScp $remoteTemporary)",
        "mv $(Quote-WinScp $remoteTemporary) `"/.htaccess`""
    ) | Out-Null
}

function Test-Deployment([string]$ExpectedRelease) {
    $handler = [Net.Http.HttpClientHandler]::new()
    $handler.AutomaticDecompression = [Net.DecompressionMethods]::All
    $client = [Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(30)
    $client.DefaultRequestHeaders.UserAgent.ParseAdd('GOD-Mode-Deploy/1.0')
    $client.DefaultRequestHeaders.CacheControl = [Net.Http.Headers.CacheControlHeaderValue]::Parse('no-cache')

    try {
        $cacheBust = [uri]::EscapeDataString($ExpectedRelease)
        $rootUrl = "$($SiteUrl.TrimEnd('/'))/?deploy=$cacheBust"
        $root = $client.GetAsync($rootUrl).GetAwaiter().GetResult()
        $body = $root.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        if (-not $root.IsSuccessStatusCode) {
            throw "Home page returned HTTP $([int]$root.StatusCode)."
        }
        if ($body -notmatch 'GOD Mode|GOD MODE|Deep Focus System') {
            throw 'Home page does not contain the expected GOD Mode marker.'
        }

        $assetMatch = [regex]::Match($body, '/_next/static/[^"''?]+\.js')
        if (-not $assetMatch.Success) {
            throw 'No Next.js JavaScript asset was found in the deployed HTML.'
        }

        foreach ($path in @($assetMatch.Value, '/sources/Icon_rounded.png')) {
            $assetUrl = "$($SiteUrl.TrimEnd('/'))$path`?deploy=$cacheBust"
            $response = $client.GetAsync($assetUrl).GetAwaiter().GetResult()
            if (-not $response.IsSuccessStatusCode) {
                throw "$path returned HTTP $([int]$response.StatusCode)."
            }
            if (($response.Content.Headers.ContentLength ?? 0) -eq 0) {
                throw "$path returned an empty response."
            }
        }
    } finally {
        $client.Dispose()
        $handler.Dispose()
    }
}

function Invoke-SmokeTests([string]$ExpectedRelease) {
    $lastError = $null
    foreach ($attempt in 1..4) {
        try {
            Test-Deployment -ExpectedRelease $ExpectedRelease
            Write-Host "Smoke tests passed on attempt $attempt." -ForegroundColor Green
            return
        } catch {
            $lastError = $_
            if ($attempt -lt 4) { Start-Sleep -Seconds 3 }
        }
    }
    throw "Smoke tests failed: $($lastError.Exception.Message)"
}

New-Item -ItemType Directory -Path $TempDir | Out-Null
try {
    if (-not (Test-Path -LiteralPath $CredFile)) {
        throw 'Missing deploy\credentials.ps1. Copy deploy\credentials.example.ps1 and fill in the password.'
    }

    . $CredFile
    foreach ($name in 'FtpHost', 'FtpUser', 'FtpPassword') {
        $variable = Get-Variable -Name $name -ErrorAction SilentlyContinue
        if (-not $variable -or [string]::IsNullOrWhiteSpace([string]$variable.Value) -or
            [string]$variable.Value -eq 'REPLACE_WITH_HOSTING_PASSWORD') {
            throw "Credential variable `$$name is not configured."
        }
    }

    $script:WinScp = Find-WinScp
    $sessionUrl = "$Protocol`://$FtpUser@$FtpHost/"
    $openParts = @(
        "open $(Quote-WinScp $sessionUrl)",
        "-password=$(Quote-WinScp $FtpPassword)",
        '-passive=on'
    )
    if ($AcceptAnyCertificate) { $openParts += '-certificate="*"' }
    $script:OpenCommand = $openParts -join ' '

    if ($Rollback) {
        $currentPointer = Join-Path $TempDir 'current.htaccess'
        $rollbackPointer = Join-Path $TempDir 'rollback.htaccess'
        Invoke-WinScp -Commands @(
            "get `"/.htaccess`" $(Quote-WinScp $currentPointer)",
            "get `"/.godmode/rollback.htaccess`" $(Quote-WinScp $rollbackPointer)"
        ) | Out-Null

        $rollbackLabel = ([IO.File]::ReadLines($rollbackPointer) | Select-Object -First 1).Trim()
        Write-Host "Switching to rollback pointer: $rollbackLabel"
        Publish-Pointer -LocalPointer $rollbackPointer -Suffix 'rollback'
        try {
            Invoke-SmokeTests -ExpectedRelease 'rollback'
        } catch {
            Write-Warning $_.Exception.Message
            Write-Warning 'Rollback target failed smoke tests. Restoring the current pointer.'
            Publish-Pointer -LocalPointer $currentPointer -Suffix 'rollback-restore'
            throw
        }

        Invoke-WinScp -Commands @(
            "put -transfer=ascii $(Quote-WinScp $currentPointer) `"/.godmode/rollback.htaccess`""
        ) | Out-Null
        Write-Host 'Rollback completed and verified.' -ForegroundColor Green
        return
    }

    $gitHash = (& git -C $RepoRoot rev-parse --short=12 HEAD 2>$null)
    if (-not $gitHash) { $gitHash = 'no-git' }
    $isDirty = [bool](& git -C $RepoRoot status --porcelain 2>$null)
    $dirtySuffix = if ($isDirty) { '-dirty' } else { '' }
    $releaseId = "$(Get-Date -AsUTC -Format 'yyyyMMddTHHmmssZ')-$gitHash$dirtySuffix"
    $remoteRelease = "/.godmode/releases/$releaseId"

    if (-not $SkipBuild) {
        $env:CI = 'true'
        Push-Location $RepoRoot
        try {
            foreach ($arguments in @(@('pnpm', 'lint'), @('pnpm', 'typecheck'), @('pnpm', 'build'))) {
                & corepack @arguments
                if ($LASTEXITCODE -ne 0) { throw "corepack $($arguments -join ' ') failed." }
            }
        } finally {
            Pop-Location
        }
    }

    foreach ($required in 'index.html', '404.html') {
        if (-not (Test-Path -LiteralPath (Join-Path $OutDir $required))) {
            throw "Static export is incomplete: out\$required is missing."
        }
    }

    $files = Get-ChildItem -LiteralPath $OutDir -Recurse -File
    $bytes = ($files | Measure-Object -Property Length -Sum).Sum
    Write-Host ''
    Write-Host 'GOD Mode atomic FTPS deployment' -ForegroundColor Cyan
    Write-Host "Release : $releaseId"
    Write-Host "Files   : $($files.Count)"
    Write-Host ('Size    : {0:N2} MiB' -f ($bytes / 1MB))
    Write-Host "Target  : $FtpUser@$FtpHost$remoteRelease ($Protocol)"

    if ($DryRun) {
        Write-Host 'Mode    : DRY RUN (remote server will not be changed)' -ForegroundColor Yellow
        Invoke-WinScp -Commands @('ls "/"') | Out-Null
        Write-Host 'Dry run passed: FTPS connection and local export are ready.' -ForegroundColor Green
        return
    }

    Invoke-WinScp -ContinueOnError -Commands @(
        'mkdir "/.godmode"',
        'mkdir "/.godmode/releases"',
        "mkdir $(Quote-WinScp $remoteRelease)"
    ) | Out-Null

    Invoke-WinScp -Commands @(
        "synchronize remote -delete -criteria=size -resumesupport=off $(Quote-WinScp $OutDir) $(Quote-WinScp $remoteRelease)"
    ) | Out-Null

    $previousPointer = Join-Path $TempDir 'previous.htaccess'
    Invoke-WinScp -ContinueOnError -Commands @(
        "get `"/.htaccess`" $(Quote-WinScp $previousPointer)"
    ) | Out-Null
    if (-not (Test-Path -LiteralPath $previousPointer)) {
        Write-Utf8File -Path $previousPointer -Content @'
# GOD Mode legacy root (no release pointer)
RewriteEngine Off
'@
    }

    Invoke-WinScp -Commands @(
        "put -transfer=ascii $(Quote-WinScp $previousPointer) `"/.godmode/rollback.htaccess`""
    ) | Out-Null

    $newPointer = Join-Path $TempDir 'next.htaccess'
    Write-Utf8File -Path $newPointer -Content @"
# GOD Mode release: $releaseId
Options -Indexes
RewriteEngine On
RewriteRule ^\.godmode(?:/|$) - [L]
RewriteRule ^(.*)$ /.godmode/releases/$releaseId/`$1 [L]
ErrorDocument 404 /.godmode/releases/$releaseId/404.html
"@

    Publish-Pointer -LocalPointer $newPointer -Suffix $releaseId
    try {
        Invoke-SmokeTests -ExpectedRelease $releaseId
    } catch {
        Write-Warning $_.Exception.Message
        Write-Warning 'Post-deploy tests failed. Restoring the previous pointer.'
        Publish-Pointer -LocalPointer $previousPointer -Suffix "$releaseId-rollback"
        try {
            Invoke-SmokeTests -ExpectedRelease 'automatic-rollback'
            Write-Warning 'Automatic rollback completed and the previous version passed smoke tests.'
        } catch {
            Write-Warning "The previous version was restored, but its smoke tests also failed: $($_.Exception.Message)"
        }
        throw 'Deployment failed and was rolled back.'
    }

    Write-Host "Deployment completed: $SiteUrl" -ForegroundColor Green
    Write-Host 'Manual rollback command: .\deploy\deploy.ps1 -Rollback'
} finally {
    if (Test-Path -LiteralPath $TempDir) {
        Remove-Item -LiteralPath $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
