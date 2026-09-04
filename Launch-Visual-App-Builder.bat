@echo off
setlocal
title Visual App Builder & AI Studio
echo ==========================================================
echo   Visual App Builder & AI Studio (Windows Launcher)
echo ==========================================================
echo.

set PORT=3000

:: Check if Node is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not detected in your system PATH.
    echo Please install Node.js from https://nodejs.org/ to run the server.
    pause
    exit /b 1
)

echo Starting Visual App Builder server on port %PORT%...
start "Visual App Builder Server" /B node .next\standalone\server.js

echo Waiting for server initialization...
timeout /t 3 /nobreak >nul

:: Try launching in Edge App Mode (clean desktop window) or default browser
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:%PORT%/builder/default
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:%PORT%/builder/default
) else (
    start http://localhost:%PORT%/builder/default
)

echo.
echo Application is running at http://localhost:%PORT%/builder/default
echo Press any key to stop the server and exit.
pause >nul
taskkill /F /IM node.exe >nul 2>&1
exit
