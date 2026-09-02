@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Chua cai Node.js. Tai LTS tai https://nodejs.org roi chay lai start.bat
  pause
  exit /b 1
)

if not exist "package.json" (
  echo Chay file nay trong thu muc gdvnc-web (co package.json).
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Dang cai npm packages (lan dau)...
  call npm install
  if errorlevel 1 (
    echo npm install that bai.
    pause
    exit /b 1
  )
)

if not exist ".env.local" (
  if exist ".env.example" copy /Y ".env.example" ".env.local" >nul
  echo.
  echo Thieu .env.local. Mo file .env.local, dien DATABASE_URL (va DIRECT_URL) roi chay lai start.bat
  echo Huong dan: HUONG-DAN-LOCAL.md
  echo.
  pause
  exit /b 1
)

echo.
echo GDVN local: http://localhost:8088
echo Tat server: Ctrl+C
echo.
call npm run dev
