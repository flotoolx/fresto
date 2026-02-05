@echo off
echo ==========================================
echo   D'Fresto - Git Push Helper
echo ==========================================
echo.

:: 1. Check status
git status
echo.

:: 2. Ask for commit message
set /p commit_msg="Masukkan pesan commit (contoh: Update dashboard): "

if "%commit_msg%"=="" (
    echo Error: Pesan commit tidak boleh kosong!
    pause
    exit /b
)

:: 3. Execute
echo.
echo [1/3] Menambahkan file...
git add .

echo [2/3] Membuat commit...
git commit -m "%commit_msg%"

echo [3/3] Upload ke GitHub...
git push origin main

echo.
echo ==========================================
echo   Selesai! Perubahan sudah di-upload.
echo   Sekarang jalankan ./deploy.sh di VPS.
echo ==========================================
pause
