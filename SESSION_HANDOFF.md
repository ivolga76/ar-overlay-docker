# SESSION_HANDOFF — 2026-07-13 (продолжение)

## Коммиты (вторая половина сессии 12.07 + 13.07)

| Коммит | Что |
|--------|-----|
| `4dce3a5` | feat: retrospective Elo simulation — MMR-график по sheet_matches |
| `2132fbc` | style: Catmull-Rom spline — плавный график |
| `26bc00a` | fix: leaderboard = Google Sheets (убрал Elo override, tournament merge) |
| `6394341` | fix: case-insensitive opponent matching |
| `6a91f80` | fix: cache: 'no-store' для player stats |
| `9765e80` | chore: update SESSION_HANDOFF + .gitignore |
| `f5801af` | feat: admin dashboard — ratings, sheet data, last import date |
| `6870c0f` | feat: 2x2 team roster в leaderboard + страница команды |
| `91d0639` | fix: sheet-matches lookup — hyphenated slugs + case-insensitive |
| `7f983e8` | style: team roster inline в 2x2 leaderboard |
| `911b04d` | fix: const → let для teamRoster |
| `47dfd9a` | fix: no cache for leaderboard/standings — instant updates after import |
| `64d4158` | fix: PK ratings → (season_id, mode, rank) — supports duplicate nicks |

---

## Текущее состояние

### Данные (после импорта 13.07)
- **82 игрока** 1×1 (season-2), **24 команды** 2×2 (season-2)
- **67 sheet_matches** 1×1, **19 sheet_matches** 2×2, **24 sheet_teams**
- season-1: archived, season-2: active
- Бэкап: `/opt/ar-overlay/.data/ar-overlay.db.bak-20260712`

### Лидерборд
- 1:1 с Google Sheets (только `season_player_ratings`)
- 2×2: отображает состав команды в одну строку справа от названия
- Без кэша — обновляется мгновенно после импорта

### Страница игрока / команды
- **MMR-график** — retrospective Elo + Catmull-Rom сплайн
- **Аналитика** — карты + противники (case-insensitive)
- **Команды**: состав, история матчей, аналитика — всё как у 1×1
- Без fetch-кэша (`cache: 'no-store'`)

### Админка
- Дашборд: рейтинги 1×1/2×2, sheet-матчи, дата импорта
- Кнопка импорта Google Sheets

### БД
- `season_player_ratings` PK: `(season_id, mode, rank)` (миграция 009)
- Миграции: 001–009, авто-применяются при старте

---

## VPS
- `ar-overlay` (3001) — healthy
- `ar-overlay-leaderboard` (3002) — healthy

---

## Pending
- `streak` в tournament_standings — не заполняется
- Страница игрока 404 для players только в `season_player_ratings` (без записи в `players` таблице)

---

## Ключевые файлы
| Файл | Роль |
|------|------|
| `production-server.js` | API: leaderboard, retrospective Elo, player stats, import-sheets |
| `leaderboard/src/app/player/[playerId]/page.tsx` | Страница игрока/команды: MMR, аналитика, состав |
| `leaderboard/src/app/standings/page.tsx` | Лидерборд: force-dynamic |
| `leaderboard/src/app/admin/page.tsx` | Дашборд: рейтинги, sheets, импорт |
| `leaderboard/src/lib/api.ts` | API-клиент: no-store кэш |
| `leaderboard/src/components/PlayerRow.tsx` | Строка рейтинга: состав команды |
| `import-sheets.js` | Парсер CSV из Google Sheets |
| `db/schema.sql` | Полная схема БД |
| `db/migrations/009_fix_ratings_pk.sql` | Миграция: PK (season_id, mode, rank) |
