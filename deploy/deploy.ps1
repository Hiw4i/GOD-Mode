<#
.SYNOPSIS
    Деплой статического сайта GOD Mode на https://godmode.vaneev.com по FTP.

.DESCRIPTION
    Зеркалирует корень репозитория в каталог сайта на хостинге Majordomo.
    Локальная папка — источник истины: файлы, которых нет локально, удаляются на сервере.

.EXAMPLE
    .\deploy\deploy.ps1 -DryRun
    Показывает, что изменится, ничего не трогая. Обязателен при первом запуске.

.EXAMPLE
    .\deploy\deploy.ps1
    Выполняет деплой.
#>
[CmdletBinding()]
param(
    # Только показать план изменений, ничего не заливать и не удалять.
    [switch]$DryRun,

    # ftpes — FTP с шифрованием (по умолчанию). ftp — без шифрования, запасной вариант.
    [ValidateSet('ftpes', 'ftp')]
    [string]$Protocol = 'ftpes',

    # Принять любой TLS-сертификат FTP-сервера. Нужно, только если появилась ошибка сертификата.
    [switch]$AcceptAnyCertificate,

    # Каталог на сервере. По умолчанию корень, куда FTP-пользователь попадает после входа.
    [string]$RemotePath = '/'
)

$ErrorActionPreference = 'Stop'

# --- Пути -------------------------------------------------------------------
$DeployDir = $PSScriptRoot
$RepoRoot = Split-Path -Parent $DeployDir
$CredFile = Join-Path $DeployDir 'credentials.ps1'
$LogFile = Join-Path $DeployDir 'deploy.log'

# --- Учётные данные ---------------------------------------------------------
if (-not (Test-Path $CredFile)) {
    Write-Host ''
    Write-Host 'Нет файла с доступами: deploy\credentials.ps1' -ForegroundColor Red
    Write-Host 'Скопируйте deploy\credentials.example.ps1 в deploy\credentials.ps1 и впишите пароль.'
    Write-Host 'Пароль спросите у владельца хостинга — в репозитории его нет и быть не должно.'
    Write-Host ''
    exit 1
}

. $CredFile

foreach ($name in 'FtpHost', 'FtpUser', 'FtpPassword') {
    $var = Get-Variable -Name $name -ErrorAction SilentlyContinue
    if (-not $var -or [string]::IsNullOrWhiteSpace([string]$var.Value) -or
        [string]$var.Value -eq 'СЮДА_ПАРОЛЬ') {
        Write-Host "В deploy\credentials.ps1 не заполнен `$$name" -ForegroundColor Red
        exit 1
    }
}

# --- Поиск WinSCP -----------------------------------------------------------
$WinScpCandidates = @(
    'C:\Program Files (x86)\WinSCP\WinSCP.com',
    'C:\Program Files\WinSCP\WinSCP.com',
    "$env:LOCALAPPDATA\Programs\WinSCP\WinSCP.com"
)
$WinScp = $WinScpCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $WinScp) {
    $cmd = Get-Command 'WinSCP.com' -ErrorAction SilentlyContinue
    if ($cmd) { $WinScp = $cmd.Source }
}
if (-not $WinScp) {
    Write-Host ''
    Write-Host 'WinSCP не найден. Установите его одной командой:' -ForegroundColor Red
    Write-Host '  winget install WinSCP.WinSCP'
    Write-Host 'После установки откройте новое окно PowerShell и повторите запуск.'
    Write-Host ''
    exit 1
}

# --- Что не заливаем --------------------------------------------------------
# Служебные файлы репозитория и сам механизм деплоя на сервере не нужны.
$ExcludeMask = '|.git/;.github/;deploy/;DEPLOY.md;.gitignore;*.local;*.log'

# --- Сборка команды ---------------------------------------------------------
$sessionUrl = '{0}://{1}@{2}/' -f $Protocol, $FtpUser, $FtpHost

$openArgs = @(
    "open `"$sessionUrl`""
    "-password=`"$FtpPassword`""
    '-passive=on'
)
if ($AcceptAnyCertificate) { $openArgs += '-certificate="*"' }
$openCommand = $openArgs -join ' '

$syncArgs = @('synchronize remote')
if ($DryRun) { $syncArgs += '-preview' }
$syncArgs += @(
    '-delete'
    '-criteria=size,time'
    "-filemask=`"$ExcludeMask`""
    "`"$RepoRoot`""
    "`"$RemotePath`""
)
$syncCommand = $syncArgs -join ' '

# --- Запуск -----------------------------------------------------------------
Write-Host ''
Write-Host '  GOD Mode — деплой на godmode.vaneev.com' -ForegroundColor Cyan
Write-Host "  Откуда : $RepoRoot"
Write-Host "  Куда   : $FtpUser@$FtpHost$RemotePath ($Protocol)"
if ($DryRun) {
    Write-Host '  Режим  : ПРОСМОТР — ничего не изменится' -ForegroundColor Yellow
} else {
    Write-Host '  Режим  : ДЕПЛОЙ — лишние файлы на сервере будут удалены' -ForegroundColor Yellow
}
Write-Host ''

& $WinScp /ini=nul /log="$LogFile" /loglevel=0 /command `
    $openCommand `
    $syncCommand `
    'exit'

$code = $LASTEXITCODE
Write-Host ''

if ($code -ne 0) {
    Write-Host "Деплой не выполнен. Код возврата WinSCP: $code" -ForegroundColor Red
    Write-Host "Подробности: $LogFile"
    Write-Host 'Разбор частых причин — в DEPLOY.md, раздел «Если не подключается».'
    exit $code
}

if ($DryRun) {
    Write-Host 'Просмотр завершён. Если список изменений верный — запустите без -DryRun.' -ForegroundColor Green
} else {
    Write-Host 'Готово. Проверьте: https://godmode.vaneev.com/' -ForegroundColor Green
}
Write-Host ''
