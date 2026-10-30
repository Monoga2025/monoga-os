@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Monoga OS necesita Node.js y no se encontro "node" en el PATH.
  echo Instalalo desde https://nodejs.org y volve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

echo Iniciando Monoga OS...
echo El navegador se abre solo cuando el servidor esta listo.
echo Cerrar esta ventana detiene Monoga OS.
echo.

node server.mjs

echo.
echo El servidor de Monoga OS se detuvo.
pause
