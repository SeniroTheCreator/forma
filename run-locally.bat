@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   Starting local Supabase (Docker)...
echo ============================================
call pnpm supabase start
if errorlevel 1 (
    echo.
    echo Could not start Supabase. Make sure Docker Desktop is installed
    echo and running, then double-click this file again.
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Starting the Next.js dev server...
echo ============================================
start "Website Dev Server - close this window to stop the app" cmd /k "cd /d "%~dp0" && pnpm dev"

echo.
echo Waiting for http://localhost:3000 to respond...
set ATTEMPTS=0

:waitloop
set /a ATTEMPTS+=1
if !ATTEMPTS! GEQ 30 (
    echo.
    echo The server is taking longer than expected. Opening the browser anyway...
    goto openbrowser
)
timeout /t 2 /nobreak >nul
set STATUS=
for /f %%i in ('curl -s -o nul -w "%%{http_code}" http://localhost:3000 2^>nul') do set STATUS=%%i
if "!STATUS!"=="200" goto openbrowser
if "!STATUS!"=="307" goto openbrowser
goto waitloop

:openbrowser
echo.
echo Opening http://localhost:3000 in your browser...
start http://localhost:3000

echo.
echo ============================================
echo   Done!
echo ============================================
echo The app is running at http://localhost:3000
echo Supabase Studio (database viewer) is at http://localhost:54323
echo.
echo Close the "Website Dev Server" window to stop the app.
echo Supabase/Docker keeps running in the background afterward -
echo run "pnpm supabase stop" in a terminal here to stop that too.
echo.
pause
endlocal
