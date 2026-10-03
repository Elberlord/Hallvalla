@echo off
setlocal
title HallValla - Compilar instalador Windows protegido
cd /d "%~dp0"

echo.
echo ==============================================
echo   HALLVALLA WINDOWS v143 - SECURITY BUILD
echo ==============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado o no esta en PATH.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm no esta disponible en PATH.
  pause
  exit /b 1
)

if not exist "..\web\hallvalla-stage.html" (
  echo [ERROR] No encuentro ..\web\hallvalla-stage.html
  pause
  exit /b 1
)

echo [1/4] Instalando/actualizando dependencias...
call npm install --no-audit --no-fund
if errorlevel 1 goto :fail

echo.
echo [2/4] Generando manifiesto SHA-256 del codigo web...
call npm run prepare:integrity
if errorlevel 1 goto :fail

echo.
echo [3/4] Generando instalador y aplicando Electron fuses...
call npm run build:win
if errorlevel 1 goto :fail

echo.
echo [4/4] Calculando SHA-256 del instalador...
if exist "dist\HallValla-Setup-v143.exe" (
  certutil -hashfile "dist\HallValla-Setup-v143.exe" SHA256
) else (
  echo [ERROR] No encuentro dist\HallValla-Setup-v143.exe
  goto :fail
)

echo.
echo LISTO:
echo %CD%\dist\HallValla-Setup-v143.exe
echo.
pause
exit /b 0

:fail
echo.
echo [ERROR] La compilacion protegida no termino correctamente.
echo.
pause
exit /b 1
