@echo off
title D'Fresto - Sistem Manajemen Franchise
color 0E

echo.
echo  ========================================
echo       D'FRESTO - FRANCHISE SYSTEM
echo  ========================================
echo.

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo [*] Installing dependencies...
    call npm install
    echo.
)

:: Generate Prisma client if needed
echo [*] Generating Prisma client...
call npx prisma generate >nul 2>&1

echo [*] Starting development server...
echo.
echo     URL: http://localhost:3000
echo.
echo     Test Accounts:
echo     - Pusat:  admin@dfresto.com / password123
echo     - Stokis: stokis.jakarta@dfresto.com / password123
echo     - Mitra:  mitra1@dfresto.com / password123
echo.
echo     Press Ctrl+C to stop server
echo.
echo  ========================================
echo.

:: Open browser after 3 seconds
start "" cmd /c "timeout /t 3 >nul && start http://localhost:3000"

:: Run dev server (will stay open)
npm run dev

:: Pause if server stopped
echo.
echo Server stopped. Press any key to close...
pause >nul
