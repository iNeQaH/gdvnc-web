@echo off
color 0b
title GDVN Production Server

echo ===================================================
echo [1/2] Dang tien hanh Build Next.js (Production)...
echo ===================================================
call npm run build
if %errorlevel% neq 0 (
    color 0c
    echo.
    echo [LOI] Qua trinh Build that bai! Vui long kiem tra log o tren.
    pause
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo [2/2] Khoi dong Server Production (Toi uu RAM)...
echo ===================================================
call npm start

pause