---
name: windows-installer
description: 'Упаковка Node.js-приложения в единый Windows-инсталлятор (.exe) с запуском серверов как служб без окон терминала. Использует esbuild для бандла в CJS, pkg для компиляции в .exe, nssm для Windows-служб, Inno Setup для финального инсталлятора. Применять когда: пользователь хочет собрать билд приложения, сделать инсталлятор, убрать окна терминала, запустить серверы как службы.'
license: MIT
allowed-tools:
  - exec_shell
  - write_file
  - read_file
  - apply_patch
  - edit_file
  - list_dir
  - grep_files
---

# Windows Installer Builder

## Overview

Создание единого `.exe`-инсталлятора для Node.js-приложения, который:

- Упаковывает всё в **один файл** (Node.js на целевой машине не нужен)
- Запускает серверы как **Windows-службы** (без открытых окон терминала)
- Поддерживает **автозапуск** при старте Windows
- Установка/удаление через стандартный мастер

## Стек инструментов

| Инструмент | Роль | Получить |
|---|---|---|
| **esbuild** | Бандлинг ESM → CJS (один файл со всеми зависимостями) | `pnpm add -D esbuild` |
| **pkg** | Компиляция CJS-бандла в один `.exe` | `npm install -g @yao-pkg/pkg` |
| **nssm** | Менеджер Windows-служб (без консольных окон) | Включается в инсталлятор |
| **Inno Setup** | Создание единого установочного `.exe` | [jrsoftware.org](https://jrsoftware.org/isinfo.php) |

> **Почему pkg + esbuild, а не nexe:** nexe требует Visual Studio Build Tools для Node.js ≥18, т.к. пребилды есть только до v12. pkg работает с готовыми бинарниками v22. Но pkg не дружит с ESM — поэтому esbuild конвертирует всё в один CJS-файл.

## Workflow

### Шаг 0: Подготовка

```bash
# Глобальные инструменты
npm install -g @yao-pkg/pkg

# Зависимости проекта
pnpm add express
pnpm add -D esbuild
pnpm build   # собирает статику в dist/
```

### Шаг 1: Создать объединённый production-сервер

Скопировать `production-server.template.js` (из этого скилла) в корень проекта как `production-server.js`.

Что внутри шаблона:
- **Express** раздаёт `dist/` на порту 3001
- **WebSocketServer** на том же порту (синхронизация оверлея с админкой)
- CJS/ESM dual-compat `__dirname` (работает и в Node, и после esbuild)
- При запуске открывает браузер с админкой (опционально, `NO_BROWSER=1` отключает)

### Шаг 2: Собрать фронтенд

```bash
pnpm build
```

Убедиться, что `dist/index.html` существует.

### Шаг 3: Собрать CJS-бандл через esbuild

```bash
npx esbuild production-server.js --bundle --platform=node --outfile=production-server.cjs --format=cjs
```

Флаги:
- `--bundle` — включить все зависимости в один файл (express, ws, etc.)
- `--platform=node` — Node.js-совместимый бандл
- `--format=cjs` — CommonJS (нужен для pkg)

Результат: `production-server.cjs` (~1.2 MB, автономный JS-файл)

### Шаг 4: Скомпилировать в .exe через pkg

```bash
pkg production-server.cjs --targets node22-win-x64 --output build/AR_Overlay_Server.exe --fallback-to-source
```

После сборки скопировать статику и проверить:

```bash
Copy-Item -Recurse -Force dist build\dist
$env:NO_BROWSER='1'; .\build\AR_Overlay_Server.exe
# Должен вывести:
#   AR Overlay Server v1.0
#   Static files:  ...\build\dist
#   WebSocket:     ws://localhost:3001
#   Admin:         http://localhost:3001/admin
#   Overlay:       http://localhost:3001/overlay
```

### Шаг 5: Скачать nssm

```powershell
curl.exe -L -o tools\nssm.zip "https://nssm.cc/ci/nssm-2.24-101-g897c7ad.zip"
Expand-Archive -Force tools\nssm.zip -DestinationPath tools\nssm_extract
Copy-Item tools\nssm_extract\nssm-*\win64\nssm.exe tools\nssm.exe
```

### Шаг 6: Скопировать скрипты служб

Из этого скилла скопировать в корень проекта:
- `install-service.bat` — регистрирует службу `AR_Overlay`, автостарт, скрытое окно
- `uninstall-service.bat` — останавливает и удаляет службу

### Шаг 7: Создать Inno Setup инсталлятор

Скопировать `installer.iss` (из этого скилла) и адаптировать:

1. Заменить `<<APP_VERSION>>` на актуальную версию
2. Убедиться, что пути к файлам корректны:
   - `build\AR_Overlay_Server.exe`
   - `tools\nssm.exe`
   - `install-service.bat`
   - `uninstall-service.bat`
3. Запустить компиляцию: Inno Setup Compiler → File → Open → `installer.iss` → Build → Compile

**Результат:** `Output/AR_Overlay_Setup.exe` — один файл, готовый к распространению.

### Шаг 8: Проверка

1. Запустить `AR_Overlay_Setup.exe` на чистой машине
2. Убедиться, что служба `AR_Overlay` появилась в `services.msc`
3. Открыть `http://localhost:3001/admin` — админка должна работать
4. Открыть `http://localhost:3001/overlay` — оверлей должен работать
5. Проверить синхронизацию: изменить состояние в админке → оверлей обновляется
6. Убедиться, что **нет окон терминала**
7. Перезагрузить машину → служба должна запуститься автоматически

## Важные замечания

### Данные состояния

Файл `.data/tournament-state.json` пишется рядом с `.exe`. При установке в `Program Files` нужны права на запись — nssm запускает службу от SYSTEM, права есть.

### Порты

По умолчанию сервер слушает порт **3001**. Для смены: `PORT=3002` в переменных окружения службы.

### OBS Browser Source

После установки в OBS нужно обновить URL Browser Source:
- Было: `http://localhost:5173/overlay`
- Стало: `http://localhost:3001/overlay`

### Обновление

При выпуске новой версии:
1. `pnpm build`
2. `npx esbuild production-server.js --bundle --platform=node --outfile=production-server.cjs --format=cjs`
3. `pkg production-server.cjs --targets node22-win-x64 --output build/AR_Overlay_Server.exe --fallback-to-source`
4. Обновить `APP_VERSION` в `installer.iss`
5. Скомпилировать новый `Setup.exe`

Службу на целевой машине нужно остановить перед заменой `.exe`:
```bash
nssm stop AR_Overlay
```

### Антивирус

`.exe`, собранный через pkg, может ложно детектироваться. Решение:
- Подписать `.exe` сертификатом (рекомендуется для распространения)
- Либо добавить в исключения антивируса

## Файлы скилла

| Файл | Назначение |
|---|---|
| `SKILL.md` | Этот документ |
| `production-server.template.js` | Шаблон сервера (ESM / CJS dual-compat) |
| `installer.iss` | Шаблон Inno Setup скрипта |
| `install-service.bat` | Скрипт установки Windows-службы |
| `uninstall-service.bat` | Скрипт удаления Windows-службы |
