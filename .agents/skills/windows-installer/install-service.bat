@echo off
setlocal enabledelayedexpansion
title Installing AR Overlay Service...

:: install-service.bat
:: Регистрирует AR_Overlay как Windows-службу через nssm
:: Параметр: путь к папке установки (например, "C:\Program Files\AR Overlay")

set "APP_DIR=%~1"
if "%APP_DIR%"=="" set "APP_DIR=%~dp0"
set "EXE=%APP_DIR%\AR_Overlay_Server.exe"
set "NSSM=%APP_DIR%\nssm.exe"
set "SERVICE_NAME=AR_Overlay"
set "SERVICE_DISPLAY=AR Overlay - Tournament Sync Server"

echo.
echo ============================================
echo   Installing AR Overlay Windows Service
echo ============================================
echo   App dir:  %APP_DIR%
echo   Exe:      %EXE%
echo   Service:  %SERVICE_NAME%
echo ============================================
echo.

:: Проверка наличия файлов
if not exist "%NSSM%" (
    echo [ERROR] nssm.exe not found at %NSSM%
    echo Download nssm from https://nssm.cc/download and place it in tools\nssm.exe
    pause
    exit /b 1
)

if not exist "%EXE%" (
    echo [ERROR] Server executable not found at %EXE%
    pause
    exit /b 1
)

:: Остановить и удалить старую службу, если есть
echo [1/4] Checking for existing service...
"%NSSM%" status "%SERVICE_NAME%" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo   Found existing service — removing...
    "%NSSM%" stop "%SERVICE_NAME%" >nul 2>&1
    timeout /t 2 /nobreak >nul
    "%NSSM%" remove "%SERVICE_NAME%" confirm >nul 2>&1
)

:: Зарегистрировать новую службу
echo [2/4] Installing service...
"%NSSM%" install "%SERVICE_NAME%" "%EXE%"
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Failed to install service
    pause
    exit /b 1
)

:: Настройка службы
echo [3/4] Configuring service...

:: Имя службы в списке services.msc
"%NSSM%" set "%SERVICE_NAME%" DisplayName "%SERVICE_DISPLAY%"
:: Описание
"%NSSM%" set "%SERVICE_NAME%" Description "AR Overlay tournament sync server — WebSocket + static files on port 3001"
:: Автозапуск при старте Windows
"%NSSM%" set "%SERVICE_NAME%" Start SERVICE_AUTO_START
:: Рабочая директория
"%NSSM%" set "%SERVICE_NAME%" AppDirectory "%APP_DIR%"
:: Не показывать окно терминала
"%NSSM%" set "%SERVICE_NAME%" AppNoConsole 1
:: Перезапуск при падении
"%NSSM%" set "%SERVICE_NAME%" AppExit Default Restart
:: Задержка перед перезапуском (мс)
"%NSSM%" set "%SERVICE_NAME%" AppRestartDelay 3000

:: Запуск службы
echo [4/4] Starting service...
"%NSSM%" start "%SERVICE_NAME%"

if !ERRORLEVEL! EQU 0 (
    echo.
    echo ============================================
    echo   SUCCESS! Service is running.
    echo   Admin:    http://localhost:3001/admin
    echo   Overlay:  http://localhost:3001/overlay
    echo   Manage:   services.msc (look for "%SERVICE_DISPLAY%")
    echo ============================================
) else (
    echo.
    echo [WARNING] Service installed but failed to start.
    echo Check services.msc or run: nssm start %SERVICE_NAME%
)

echo.
exit /b 0
