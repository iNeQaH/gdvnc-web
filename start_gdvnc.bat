@echo off
title GDVNC Control Panel
color 0B
chcp 65001 >nul

:: Đặt một port đặc biệt cho dự án (8088 thay vì 3000)
set PORT=8088

:menu
cls
echo ===================================================
echo            GDVNC - CONTROL PANEL
echo ===================================================
echo.
echo   [1] Khoi dong Server (Port %PORT%)
echo   [2] Tat Server ^& Xoa sach tien trinh ngam (Cleanup)
echo   [3] Cap nhat Database ^& Tao du lieu mau (Seed)
echo   [0] Thoat
echo.
set /p choice="Chon mot tuy chon (0-3): "

if "%choice%"=="1" goto start_server
if "%choice%"=="2" goto stop_server
if "%choice%"=="3" goto seed_db
if "%choice%"=="0" exit
goto menu

:start_server
echo.
echo [*] Dang kiem tra va don dep port %PORT% neu bi ket...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%PORT% "') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [*] Dang khoi dong Next.js Server tren cong %PORT% (0.0.0.0 - cho phep may khac truy cap)...
echo [*] May nay:     http://localhost:%PORT%
echo [*] May trong LAN / port forward: http://IP-MAY-CHU:%PORT%
echo [*] (Nhan Ctrl+C bat cu luc nao de dung server)
echo.
call npm run dev -- -H 0.0.0.0 -p %PORT%

echo.
echo [!] Server da dung. Tu dong don dep cac tien trinh ngam...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%PORT% "') do (
    taskkill /F /PID %%a >nul 2>&1
)
pause
goto menu

:stop_server
echo.
echo [*] Dang tim va tat toan bo tien trinh dang chay GDVNC...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":%PORT% "') do (
    echo  - Da tat tien trinh PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)
echo [*] Hoan tat! Moi thu da duoc tat sach se.
pause
goto menu

:seed_db
echo.
echo [*] Dang dong bo Schema voi Database...
call npx prisma db push
echo [*] Dang tao du lieu mau (Mock records)...
call npx prisma db seed
echo [*] Hoan tat!
pause
goto menu
