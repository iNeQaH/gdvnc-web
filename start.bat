@echo off
cd /d "%~dp0"

title GDVN Local Web Server

echo ========================================================
echo   Starting GDVN Web Server Local...
echo   Url: http://localhost:8088
echo   Press Ctrl+C to stop the server.
echo ========================================================
echo.

call npm run dev
if errorlevel 1 (
    echo.
    echo Server stopped with error.
    pause
)
