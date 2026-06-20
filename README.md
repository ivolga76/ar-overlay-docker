# AR Overlay Docker

**OBS Overlay для турниров Arc Raiders** — полностью контейнеризированная версия.
Разворачивается одной командой на VPS (Debian/Ubuntu).

React + Vite (SPA) + Node.js (Express + WebSocket) в одном Docker-контейнере.
Порт 3001 — статика, REST API и WebSocket на одном порту.

---

## Возможности

- Прозрачный фон для OBS Browser Source
- Drag-and-drop редактор расположения виджетов
- Управление турниром: раунды, участники, очки, задания, усложнения
- Рулетка задач и усложнений с анимацией
- Таймер с пресетами (30с / 1мин / 2мин / 3мин)
- Турнирная таблица (standings)
- WebSocket-синхронизация между админкой и оверлеем
- **Per-user изоляция** — каждый пользователь управляет своим турниром
- Аутентификация: регистрация, вход, смена пароля (scrypt)
- Экспорт/импорт состояния турнира (JSON)

---

## Быстрая установка на VPS

```bash
curl -sSL https://raw.githubusercontent.com/ivolga76/ar-overlay-docker/main/install.sh | bash
```

Скрипт автоматически:
1. Установит Docker (если не установлен)
2. Склонирует репозиторий в `/opt/ar-overlay`
3. Соберёт образ и запустит контейнер

После установки:
- **Админка:** `http://<VPS_IP>:3001/admin`
- **OBS Browser Source:** `http://<VPS_IP>:3001/overlay/<user-id>` (1920×1080)

---

## Ручная установка

```bash
# Клонировать репозиторий
git clone https://github.com/ivolga76/ar-overlay-docker.git
cd ar-overlay-docker

# Собрать и запустить
docker compose up -d --build
```

---

## Управление контейнером

```bash
docker compose logs -f     # просмотр логов
docker compose restart      # перезапуск
docker compose down         # остановка
docker compose up -d        # запуск
docker compose pull         # обновление образа
```

---

## Разработка (без Docker)

```bash
pnpm install
pnpm dev          # Vite dev-сервер (порт 5173) + WebSocket-сервер (порт 3001)
pnpm build        # Production-сборка
pnpm production   # Production-сервер (Express, порт 3001)
```

---

## Доступ

| Путь | Назначение |
|------|------------|
| `/` | SPA (Single Page Application) |
| `/admin` | Админ-панель организатора (требует авторизации) |
| `/overlay/<user-id>` | Оверлей для OBS (публичный) |
| `/api/register` | Регистрация |
| `/api/login` | Вход |
| `/api/me` | Проверка токена |
| `/api/change-password` | Смена пароля |

---

## Архитектура

```
┌─ Docker Container (node:22-alpine) ──────────────┐
│                                                     │
│  production-server.js (Express, порт 3001)          │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Статика      │  │ REST API │  │ WebSocket    │  │
│  │ dist/ → /    │  │ /api/*   │  │ ws:// :3001  │  │
│  │ (SPA)        │  │          │  │              │  │
│  └──────────────┘  └──────────┘  └──────────────┘  │
│                                                     │
│  Данные: .data/ (volume)                            │
│  ┌──────────────────────────────────────────────┐   │
│  │ users.json  sessions.json  state/{id}.json   │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Настройка OBS

1. Добавьте **Browser Source**
2. **URL:** `http://<VPS_IP>:3001/overlay/<user-id>`  
   (user-id можно скопировать из админ-панели — кнопка 📋 рядом со ссылкой на оверлей)
3. **Width:** `1920`, **Height:** `1080`
4. Включите прозрачный фон, если OBS предлагает эту опцию

---

## HTTPS

Для HTTPS рекомендуется поставить nginx-proxy + Let's Encrypt перед контейнером:

```bash
docker run -d -p 80:80 -p 443:443 \
  -v /var/run/docker.sock:/tmp/docker.sock:ro \
  -v certs:/etc/nginx/certs \
  jwilder/nginx-proxy
```

Или использовать Cloudflare Tunnel.

---

## Обновление

```bash
cd /opt/ar-overlay
git pull
docker compose up -d --build
```

Данные пользователей и турниров сохраняются в Docker volume и не теряются при обновлении.

---

## Лицензия

MIT
