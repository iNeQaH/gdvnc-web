$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Chua cai Node.js. Tai LTS tai https://nodejs.org roi chay lai start.ps1'
  exit 1
}

if (-not (Test-Path -LiteralPath 'package.json')) {
  Write-Host 'Chay file nay trong thu muc gdvnc-web (co package.json).'
  exit 1
}

if (-not (Test-Path -LiteralPath 'node_modules')) {
  Write-Host 'Dang cai npm packages (lan dau)...'
  npm install
}

if (-not (Test-Path -LiteralPath '.env.local')) {
  if (Test-Path -LiteralPath '.env.example') {
    Copy-Item '.env.example' '.env.local'
  }
  Write-Host 'Thieu .env.local. Dien DATABASE_URL (va DIRECT_URL) roi chay lai.'
  Write-Host 'Huong dan: HUONG-DAN-LOCAL.md'
  exit 1
}

Write-Host 'GDVN local: http://localhost:8088'
Write-Host 'Tat server: Ctrl+C'
npm run dev
