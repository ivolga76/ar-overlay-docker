@echo off
title AR Overlay - Server
cd /d "%~dp0"

echo.
echo ====================================
echo   AR Overlay - запуск серверов
echo ====================================
echo.

:: Проверка Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ОШИБКА] Node.js не найден. Установите Node.js с https://nodejs.org
    pause
    exit /b 1
)

:: Проверка pnpm
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ОШИБКА] pnpm не найден. Установите: npm install -g pnpm
    pause
    exit /b 1
)

:: Установка зависимостей (если node_modules отсутствует)
if not exist "node_modules" (
    echo [INFO] Установка зависимостей...
    call pnpm install
)

echo.
echo [1/2] WebSocket сервер синхронизации (порт 3001)...
start "SyncServer" cmd /c "cd /d %~dp0 && node server.js"

echo [2/2] Vite dev-сервер (порт 5173)...
echo.
pnpm dev

echo.
echo Серверы остановлены.
pause