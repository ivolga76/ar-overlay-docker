# План: Добавление Сезона 2 в AR Overlay

> Составлен: 2026-06-27  
> На основе: [Google Doc — «Битва за Респект», Сезон 2](https://docs.google.com/document/d/11nsXkIAs5Q-YG_erlTTK8PQDnSBX1kwO68syoH4Cqwc)

---

## Текущее состояние (Сезон 1)

| Что есть | Как работает |
|----------|-------------|
| Турниры | CRUD, статусы draft/active/completed, 1x1 и 2x2 |
| Участники | Игроки и команды (с членами для 2x2) |
| Задания | Текст + очки, назначаются на турнир |
| Осложнения (complications) | ШаблоныExtension, назначаются на турнир |
| Бонус-задания | Шаблоны, назначаются на турнир |
| Раунды | Запись результата: участник, очки, выполненные задания |
| Таблица (standings) | Вычисляется при complete: очки, ранг |
| MMR | Примитивный: `totalPoints + wins×3 − losses×1` |
| Лидерборд | `/api/leaderboard`, `/api/leaderboard/:id`, фильтр по mode |
| Профиль игрока | `/api/players/:id` — история, статистика |

---

## Что нового в Сезоне 2 (из Google Doc)

### 1. Явная концепция сезонов
- Сезон 1 (текущий) и Сезон 2 (новый)
- У каждого сезона — отдельные рейтинги 1×1 и 2×2
- История матчей по сезонам
- Составы команд 2×2 (публичная страница)

### 2. Контракты (Contracts)
- **4 категории**: Boosty-подписчиков, PvE, PvPvE, PvP
- Каждый участник получает **2 случайных контракта** перед раундом
- Стоимость: **2 балла** за свой контракт
- **Контракт противника**: +1 балл, если выполнил чужой контракт
- ~15 PvE-контрактов, ~15 PvPvE-контрактов, ~9 PvP-контрактов (из документа)

### 3. Легендарные контракты (Legendary Contracts)
- Одноразовые на весь сезон: один игрок — одно выполнение
- Стоимость: **10 баллов**
- После выполнения: игрок получает роль в Discord, контракт недоступен
- ~10 легендарных PvE + ~4 легендарных PvP + 2 от Boosty (из документа)

### 4. Активные протоколы (Active Protocols)
- Случайные ограничения на участника перед раундом
- ~25 протоколов (из документа)
- Нарушение = **−1 минута** внутри рейда

### 5. Типы игроков
- PvP, PvE, PvPvE (смешанный)
- Задания раунда зависят от типа игроков
- PvE-игроки соревнуются только с PvE

### 6. Предтурнирная информация
- Embark ID участника
- Количество часов в игре
- Тип лобби (PvP/PvE/PvPvE)

### 7. Раздельные рейтинги 1×1 и 2×2
- Сезон 2: Рейтинг 1×1
- Сезон 2: Рейтинг 2×2
- Публичные страницы для каждого

### 8. Boosty-интеграция (подписчики)
- Предлагать карты, билды, задания, усложнения
- Именные контракты от подписчиков

---

## GAP-анализ: чего нет в текущей системе

| Фича | Сезон 1 | Нужно для Сезона 2 |
|------|---------|---------------------|
| Таблица `seasons` | ❌ | ✅ Новая |
| `season_id` в tournaments | ❌ | ✅ FK |
| Контракты (пул + назначение) | ❌ | ✅ Новые таблицы + API |
| Легендарные контракты (once-per-season) | ❌ | ✅ Новые таблицы + API |
| Активные протоколы (пул + назначение) | ❌ | ✅ Новые таблицы + API |
| Тип игрока (PvP/PvE/PvPvE) | ❌ | ✅ Поле в participants |
| Embark ID | ❌ | ✅ Поле в participants |
| Часы в игре | ❌ | ✅ Поле в participants |
| Тип лобби | ❌ | ✅ Поле в participants |
| Раздельные 1×1/2×2 рейтинги | Частично (фильтр mode) | ✅ Полноценные страницы |
| История матчей (VOD) | ❌ | ✅ Новая страница |
| Составы команд 2×2 (публичные) | ❌ | ✅ Новая страница |
| Boosty-контент | ❌ | ✅ Флаг + именные контракты |
| MMR (полноценный) | Примитивный | ✅ Улучшенная формула |
| Штрафы за протоколы | ❌ | ✅ Поле penalty_seconds |

---

## План реализации (6 фаз)

---

### Фаза 1: База данных — фундамент сезонов

#### 1.1 Новая таблица `seasons`
```sql
CREATE TABLE seasons (
  id          TEXT PRIMARY KEY,        -- 'season-1', 'season-2'
  name        TEXT NOT NULL,           -- 'Сезон 1: Битва за Респект'
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  started_at  TEXT,
  ended_at    TEXT
);
```

#### 1.2 Модификация `tournaments`
```sql
ALTER TABLE tournaments ADD COLUMN season_id TEXT REFERENCES seasons(id);
```

#### 1.3 Новые поля в `tournament_participants`
```sql
ALTER TABLE tournament_participants ADD COLUMN embark_id TEXT;
ALTER TABLE tournament_participants ADD COLUMN hours_played INTEGER;
ALTER TABLE tournament_participants ADD COLUMN lobby_type TEXT CHECK(lobby_type IN ('pvp','pve','pvpve'));
ALTER TABLE tournament_participants ADD COLUMN player_type TEXT CHECK(player_type IN ('pvp','pve','pvpve'));
```

#### 1.4 Таблица пула контрактов
```sql
CREATE TABLE contracts (
  id          TEXT PRIMARY KEY,
  season_id   TEXT NOT NULL REFERENCES seasons(id),
  category    TEXT NOT NULL CHECK(category IN ('pve','pvp','pvpve','boosty')),
  text        TEXT NOT NULL,
  points      INTEGER NOT NULL DEFAULT 2,
  is_legendary INTEGER NOT NULL DEFAULT 0,
  boosty_author TEXT,                   -- для Boosty-контрактов
  completed_by TEXT,                    -- player_id (для легендарных)
  completed_at TEXT,                    -- дата выполнения (для легендарных)
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### 1.5 Таблица назначенных контрактов
```sql
CREATE TABLE round_contracts (
  id              TEXT PRIMARY KEY,
  round_result_id TEXT NOT NULL REFERENCES round_results(id) ON DELETE CASCADE,
  contract_id     TEXT NOT NULL REFERENCES contracts(id),
  participant_id  TEXT NOT NULL REFERENCES tournament_participants(id),
  completed       INTEGER NOT NULL DEFAULT 0,
  completed_by_opponent INTEGER NOT NULL DEFAULT 0,
  points_earned   INTEGER NOT NULL DEFAULT 0
);
```

#### 1.6 Таблица активных протоколов
```sql
CREATE TABLE protocols (
  id          TEXT PRIMARY KEY,
  season_id   TEXT NOT NULL REFERENCES seasons(id),
  text        TEXT NOT NULL,
  penalty_seconds INTEGER NOT NULL DEFAULT 60,  -- штраф: −1 минута
  sort_order  INTEGER NOT NULL DEFAULT 0
);
```

#### 1.7 Таблица назначенных протоколов
```sql
CREATE TABLE round_protocols (
  id              TEXT PRIMARY KEY,
  round_result_id TEXT NOT NULL REFERENCES round_results(id) ON DELETE CASCADE,
  protocol_id     TEXT NOT NULL REFERENCES protocols(id),
  participant_id  TEXT NOT NULL REFERENCES tournament_participants(id),
  violated        INTEGER NOT NULL DEFAULT 0
);
```

#### 1.8 Новая миграция
Файл: `db/migrations/003_season2.sql`

---

### Фаза 2: API — новые и изменённые endpoint'ы

#### 2.1 Seasons API
| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/seasons` | Список всех сезонов |
| `POST` | `/api/seasons` | Создать сезон (auth) |
| `GET` | `/api/seasons/:id` | Детали сезона |
| `PUT` | `/api/seasons/:id` | Обновить сезон (auth) |

#### 2.2 Contracts API
| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/seasons/:id/contracts` | Пул контрактов сезона |
| `POST` | `/api/seasons/:id/contracts` | Добавить контракт (auth) |
| `PUT` | `/api/seasons/:id/contracts/:cid` | Обновить контракт (auth) |
| `DELETE` | `/api/seasons/:id/contracts/:cid` | Удалить контракт (auth) |
| `POST` | `/api/tournaments/:id/rounds/:rid/contracts` | Назначить случайные контракты |

#### 2.3 Protocols API
| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/seasons/:id/protocols` | Пул протоколов сезона |
| `POST` | `/api/seasons/:id/protocols` | Добавить протокол (auth) |
| `PUT` | `/api/seasons/:id/protocols/:pid` | Обновить протокол (auth) |
| `DELETE` | `/api/seasons/:id/protocols/:pid` | Удалить протокол (auth) |
| `POST` | `/api/tournaments/:id/rounds/:rid/protocols` | Назначить случайные протоколы |

#### 2.4 Legendary Contracts API
| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/seasons/:id/legendary` | Список легендарных контрактов |
| `POST` | `/api/rounds/:rid/legendary/:cid` | Зафиксировать выполнение |

#### 2.5 Изменения в существующих endpoint'ах

- **`POST /api/tournaments`** — добавить `season_id` в тело запроса
- **`POST /api/tournaments/:id/participants`** — новые поля: `embark_id`, `hours_played`, `lobby_type`, `player_type`
- **`POST /api/tournaments/:id/rounds`** — добавить учёт контрактов и протоколов
- **`GET /api/leaderboard`** — добавить фильтр `season_id`
- **`GET /api/leaderboard/:id`** — добавить в ответ информацию о сезоне
- **`GET /api/players/:id`** — добавить фильтр по сезону, историю контрактов

#### 2.6 Новые публичные endpoint'ы

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/api/seasons/:id/matches` | История матчей (1×1 и 2×2) |
| `GET` | `/api/seasons/:id/teams` | Составы команд 2×2 |
| `GET` | `/api/seasons/:id/ratings/1x1` | Рейтинг 1×1 |
| `GET` | `/api/seasons/:id/ratings/2x2` | Рейтинг 2×2 |

---

### Фаза 3: Admin Panel (React SPA) — интерфейс Сезона 2

#### 3.1 Селектор сезона
- Выпадающий список в TournamentsList: «Сезон 1» / «Сезон 2»
- При создании турнира — выбор сезона
- Фильтрация турниров по сезону

#### 3.2 Редактор контрактов (новая вкладка)
- Пул контрактов с категориями (PvE/PvP/PvPvE/Boosty)
- Добавление/редактирование/удаление
- Превью: текст, категория, очки, автор (для Boosty)

#### 3.3 Редактор протоколов (новая вкладка)
- Пул протоколов
- Добавление/редактирование/удаление
- Превью: текст, штраф

#### 3.4 Редактор легендарных контрактов
- Список с индикатором «доступен» / «выполнен (кем, когда)»
- Редактирование

#### 3.5 Обновлённая форма участника
- Новые поля: Embark ID, часы в игре, тип лобби, тип игрока
- Валидация

#### 3.6 UI раунда — контракты и протоколы
- При старте раунда: кнопка «Раздать контракты» (2 случайных)
- Отображение назначенных контрактов участнику
- Отметка выполнения (свой контракт / контракт противника)
- Кнопка «Раздать протоколы» (1 случайный на участника)
- Отметка нарушения протокола
- Кнопка «Легендарный контракт выполнен»

#### 3.7 Оверлей (Overlay.jsx)
- Отображение контрактов текущего участника
- Отображение активного протокола
- Отображение штрафов

---

### Фаза 4: Leaderboard (Next.js) — публичные страницы

#### 4.1 SeasonTabs — переключение сезонов
- Компонент `SeasonTabs` (уже есть для 1×1/2×2) — расширить до «Сезон 1 | Сезон 2»
- `StandingsTable` — данные с учётом `season_id`

#### 4.2 Новые страницы
| Маршрут | Компонент | Описание |
|---------|-----------|----------|
| `/season/[seasonId]` | `SeasonPage` | Обзор сезона: описание, ссылки на рейтинги |
| `/season/[seasonId]/1x1` | `Ratings1x1` | Рейтинг 1×1 |
| `/season/[seasonId]/2x2` | `Ratings2x2` | Рейтинг 2×2 |
| `/season/[seasonId]/matches` | `MatchHistory` | История матчей (список) |
| `/season/[seasonId]/teams` | `TeamRosters` | Составы команд 2×2 |

#### 4.3 Обновление существующих страниц
- `/standings` — добавить селектор сезона
- `/standings/[tournamentId]` — показывать, к какому сезону относится
- `FeatureCard` — добавить карточки для новых страниц
- `RainbowBar` — цветовая дифференциация сезонов (Сезон 1: cyan, Сезон 2: magenta/gold)

#### 4.4 Обновление типов
- `types.ts` — новые интерфейсы: `Season`, `Contract`, `Protocol`, `MatchEntry`, `TeamRoster`
- `api.ts` — новые функции API-клиента
- `utils.ts` — улучшенная формула MMR

---

### Фаза 5: Миграция Сезон 1 → Сезон 2

#### 5.1 Миграция базы данных
Файл: `db/migrations/003_season2.sql` + `db/migrations/003_seed_season2.js`

```sql
-- Создать Сезон 1 (backfill)
INSERT INTO seasons (id, name, status, started_at) 
VALUES ('season-1', 'Сезон 1: Битва за Респект', 'active', '2025-01-01');

-- Привязать существующие турниры к Сезону 1
UPDATE tournaments SET season_id = 'season-1' WHERE season_id IS NULL;

-- Создать Сезон 2
INSERT INTO seasons (id, name, status, started_at) 
VALUES ('season-2', 'Сезон 2: Битва за Респект', 'active', '2026-06-22');

-- Заполнить контракты Сезона 2 (из Google Doc)
-- ~38 контрактов + ~14 легендарных

-- Заполнить протоколы Сезона 2 (из Google Doc)
-- ~25 протоколов
```

#### 5.2 Сид-скрипт контрактов
Автоматически создать все контракты из документа:
- 2 Boosty-контракта (с авторами)
- 14 PvE-контрактов
- 15 PvPvE-контрактов
- 9 PvP-контрактов
- 2 Boosty легендарных
- 10 PvE легендарных
- 4 PvP легендарных

#### 5.3 Сид-скрипт протоколов
Автоматически создать все ~25 протоколов из документа.

#### 5.4 Откат
Миграция обратима:
- Удалить таблицы Сезона 2
- Удалить новые колонки
- Восстановить состояние Сезона 1

---

### Фаза 6: Деплой

#### 6.1 Порядок деплоя
1. Закоммитить все изменения (пофазово или одним PR)
2. `git push origin master && git push docker master`
3. SSH на VPS: `cd /opt/ar-overlay && git pull && docker compose up -d --build`
4. Проверить: `curl -s http://192.168.1.231:3001/` и `:3002`

#### 6.2 Откат
Всегда возможен через `git revert` → push → redeploy.

---

## Приоритеты и оценки

| Фаза | Описание | Оценка | Приоритет |
|------|----------|--------|-----------|
| 1 | База данных | ~2 ч | 🔴 Критический |
| 2 | API | ~4 ч | 🔴 Критический |
| 3 | Admin Panel | ~6 ч | 🟡 Высокий |
| 4 | Leaderboard (Next.js) | ~4 ч | 🟡 Высокий |
| 5 | Миграция + сиды | ~1 ч | 🔴 Критический |
| 6 | Деплой | ~30 мин | 🟢 Стандартный |

**Итого: ~17.5 часов** (при последовательной работе)

---

## Риски

1. **Обратная совместимость** — существующие турниры Сезона 1 не должны сломаться. Решение: все новые поля — nullable, `season_id` backfill через миграцию.
2. **Docker-билд** — Next.js standalone output с новыми страницами. Решение: проверить билд локально перед деплоем.
3. **Производительность** — JOIN'ы с новыми таблицами. Решение: индексы на все FK, `season_id` в WHERE.
4. **Boosty-интеграция** — без реального API Boosty, делаем заглушку: флаг `is_boosty` + поле `boosty_author`. Реальная интеграция — позже.

---

## Что НЕ входит в этот план (отложено)

- Реальная интеграция с Boosty API
- Real-time WebSocket для standings
- HTTPS (nginx-proxy + Let's Encrypt)
- Интеграция с Discord (роли)
- Twitch predictions API
- График MMR (recharts)
- Экспорт/импорт турниров в JSON

---

## Следующий шаг

Получить подтверждение плана → начать Фазу 1 (база данных).
