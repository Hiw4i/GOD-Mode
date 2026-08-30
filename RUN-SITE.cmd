@echo off
setlocal
cd /d "%~dp0"

rem Explorer may keep an old PATH after Node.js or pnpm was installed.
rem Add their standard Windows locations explicitly for double-click startup.
set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Close this window, reopen PowerShell, and try again.
  pause
  exit /b 1
)

where pnpm >nul 2>&1
if errorlevel 1 (
  echo pnpm was not found.
  echo Close this window, open PowerShell and run:
  echo npm install --global pnpm@11.24.0
  pause
  exit /b 1
)

rem If this project is already running, just open it instead of starting a second server.
powershell.exe -NoProfile -Command "$client = New-Object Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', 3000); exit 0 } catch { exit 1 } finally { $client.Dispose() }" >nul 2>&1
if not errorlevel 1 (
  echo GOD Mode is already running at http://localhost:3000
  start "" "http://localhost:3000"
  exit /b 0
)

echo Installing or checking project dependencies...
call pnpm install --frozen-lockfile
if errorlevel 1 (
  echo Dependency installation failed.
  pause
  exit /b 1
)

echo.
echo GOD Mode will be available at http://localhost:3000
echo Keep this window open while editing the site.
echo Press Ctrl+C to stop it.
echo.
call pnpm dev

endlocal
