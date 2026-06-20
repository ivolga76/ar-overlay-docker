@echo off
setlocal enabledelayedexpansion
title Uninstalling AR Overlay Service...

:: uninstall-service.bat
:: Останавливает и удаляет Windows-службу AR_Overlay
:: Параметр: путь к папке установки

set "APP_DIR=%~1"
if "%APP_DIR%"=="" set "APP_DIR=%~dp0"
set "NSSM=%APP_DIR%\nssm.exe"
set "SERVICE_NAME=AR_Overlay"

echo.
echo ============================================
echo   Removing AR Overlay Windows Service
echo ============================================
echo.

if not exist "%NSSM%" (
    echo [ERROR] nssm.exe not found at %NSSM%
    exit /b 1
)

:: Проверить, существует ли служба
"%NSSM%" status "%SERVICE_NAME%" >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo Service "%SERVICE_NAME%" is not installed — nothing to remove.
    exit /b 0
)

:: Остановить службу
echo [1/2] Stopping service...
"%NSSM%" stop "%SERVICE_NAME%" >nul 2>&1
timeout /t 2 /nobreak >nul

:: Удалить службу
echo [2/2] Removing service...
"%NSSM%" remove "%SERVICE_NAME%" confirm

if !ERRORLEVEL! EQU 0 (
    echo.
    echo ============================================
    echo   Service removed successfully.
    echo ============================================
) else (
    echo.
    echo [WARNING] Service removal returned non-zero code.
    echo Check services.msc manually if needed.
)

exit /b 0
