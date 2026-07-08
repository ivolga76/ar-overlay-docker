# AGENTS.md — AR Overlay

OBS overlay for ARC Raiders tournaments. Two-container Docker deployment on Raspberry Pi (ARM64 Debian).

## Architecture

```
┌─ Container ar-overlay (port 3001) ──────────────────────────┐
│ production-server.js (Express + WebSocket, no build step)    │
│                                                              │
│ Serves: dist/ (Vite SPA) at /, REST API at /api/*,          │
│ WebSocket at ws://:3001                                      │
│                                                              │
│ DB: SQLite via sql.js (WASM, in-memory + disk persistence)   │
│ State: .data/ar-overlay.db + .data/state/{userId}.json       │
│ Auth: scrypt hashing, Bearer token sessions (30-day TTL)     │
└──────────────────────────────────────────────────────────────┘

┌─ Container ar-overlay-leaderboard (port 3002) ───────────────┐
│ Next.js 16 (standalone output), Tailwind CSS v4, framer-motion│
│                                                              │
│ Proxies API calls to http://app:3001 (internal Docker network)│
│ Static pages with ISR (revalidate: 30s)                      │
└──────────────────────────────────────────────────────────────┘
```

SPA client-router: `/admin` (auth gated) → Admin panel; `/overlay/<userId>` → public OBS overlay; `/` → redirects to admin.

State sync: Admin changes → WebSocket broadcast → overlay receives `state_sync` and updates in real time. WebSocket auth via Bearer token (admin) or `subscribe` message with userId (overlay).

## Build / Run / Deploy

```bash
# Install (pnpm workspace, root only — leaderboard is separate)
pnpm install

# Dev (Vite HMR on :5173 + Express/WS on :3001)
pnpm dev

# Build SPA only
pnpm build

# Production (Express serves dist/ on :3001)
pnpm production

# Leaderboard (separate package, not in workspace)
cd leaderboard && pnpm install && pnpm dev   # Next.js on :3002

# Docker (both containers)
docker compose up -d --build

# Deploy to VPS (Raspberry Pi 192.168.1.231)
git push origin master && git push docker master
ssh -i ~/.ssh/ar_overlay_vps root@192.168.1.231 \
  "cd /opt/ar-overlay; git pull; docker compose up -d --build --force-recreate"

# Verify
curl -s http://192.168.1.231:3001/
curl -s http://192.168.1.231:3002/
```

**No test suite.** QA is manual via `_auth_tests.ps1`, `_login_test.ps1`, `_prod_test.ps1`.

## Key Files & Directories

| Path | Role |
|------|------|
| `production-server.js` | Express server: auth, REST API (~60 endpoints), WebSocket, Elo MMR, rate limiting |
| `db/connection.js` | sql.js init, query/run helpers, debounced disk save |
| `db/migrate.js` | Migration runner: `.sql` (execScript) + `.js` (`up()` export) |
| `db/migrations/` | Ordered migrations (001–007); auto-applied on startup |
| `db/schema.sql` | Full schema reference — kept in sync, not executed automatically |
| `shared/state-fields.js` | `GAME_FIELDS` array + `DEFAULT_STATE` object — single source of truth |
| `src/App.jsx` | Client router: auth guard, overlay detection, admin/overlay/leaderboard routing |
| `src/state/TournamentContext.jsx` | Central state: WebSocket sync, Elo updates, normalization |
| `src/utils/apiClient.js` | REST client (seasons, tournaments, participants, tasks, rounds, contracts, leaderboard) |
| `src/hooks/useServerSync.js` | WebSocket hook: auto-reconnect with exponential backoff, auth/subscribe |
| `leaderboard/src/lib/api.ts` | Leaderboard API client (Next.js → Express proxy) |
| `leaderboard/src/lib/types.ts` | All TypeScript interfaces for the leaderboard |
| `leaderboard/next.config.ts` | `output: 'standalone'`, turbopack root, image remote patterns |
| `vite.config.js` | Vite + React plugin, dev on :5173 |
| `docker-compose.yml` | Two services: app (:3001) + leaderboard (:3002), shared volume |
| `install.sh` | One-command VPS bootstrap (Docker + clone + build) |

## Database (SQLite via sql.js)

**Critical gotcha:** sql.js (WASM) has **no Unicode ICU support** — `LOWER()` and `UPPER()` only work for ASCII. All case-insensitive search for Cyrillic must happen in JavaScript via `.toLowerCase().includes()`.

Schema highlights:
- `players` — cross-tournament identity, `current_mmr` (Elo)
- `seasons` — groups tournaments; status: active/archived
- `tournaments` — mode (1x1/2x2), status (draft/active/completed)
- `tournament_participants` — players or teams in a tournament
- `round_results` — per-round scoring with map/death/penalty metadata
- `contracts` / `protocols` — season-level challenge pool
- `tournament_standings` — computed on completion, includes `mmr_before`/`mmr_after`
- `season_player_ratings` — Google Sheets imported ratings

Migrations run automatically on server start via `db/migrate.js`. New migrations go in `db/migrations/` with sequential numeric prefix.

## API Patterns

REST endpoints in `production-server.js` follow these conventions:
- `GET /api/<resource>` — list (with query params for filtering)
- `POST /api/<resource>` — create
- `GET /api/<resource>/:id` — get one
- `PUT /api/<resource>/:id` — update
- `DELETE /api/<resource>/:id` — delete
- Auth via `Authorization: Bearer <token>` header or `admin_token` cookie
- Responses: `{ resource: {...} }` or `{ resources: [...] }`; errors: `{ error: "message" }`
- Rate limiting: 20 req/min per IP

WebSocket message types: `auth`, `subscribe`, `state_sync`, `state_update`, `state_clear`, `timer_update`.

## Coding Conventions

- **Russian UI strings** throughout (admin panel, overlay, leaderboard)
- **ES modules** (`"type": "module"` in root package.json)
- **React 19** with hooks, Context API for state
- SPA pages: functional components in `src/pages/`, no file-based routing
- Leaderboard: Next.js App Router, Server Components where possible, `'use client'` for interactive parts
- **No TypeScript** in the SPA/Express layer (plain JS/JSX)
- **TypeScript** in the leaderboard (`leaderboard/`)
- `shared/` directory for constants used by both server and client
- Error boundaries at App level (`App.jsx`) and per widget (`ErrorBoundary.jsx`)

## Git Workflow

- **Branch:** `master` (single-branch development)
- **Commit style:** Conventional Commits (`feat:`, `fix:`, `chore:`)
- **Remotes:** `origin` (GitHub), `docker` (GitHub, used as deploy source for VPS)
- **After every commit:** push to both remotes + deploy to VPS (per project instructions)

## Common Pitfalls

1. **sql.js Unicode:** never use `WHERE LOWER(name) = LOWER(?)` — it silently fails for Cyrillic. Filter in JS.
2. **State drift:** `shared/state-fields.js` must stay in sync with both server and client defaults. If adding a field, update `DEFAULT_STATE`, `GAME_FIELDS`, and `normalizeState` in TournamentContext.
3. **Leaderboard ISR:** pages revalidate every 30s. During build, API is unavailable — `fetchAPISafe` returns empty fallbacks.
4. **Docker networking:** leaderboard calls Express at `http://app:3001` (container name). Dev mode uses `localhost:3001`.
5. **Elо MMR:** K=32, base=1000. Updated on tournament completion. Stored in `players.current_mmr` and `tournament_standings.mmr_before/after`.
6. **WebSocket reconnect:** exponential backoff up to 30s. Token/userId changes force reconnect.

## Tips for AI Agents

- Start any investigation in `production-server.js` — it contains all API routes, auth logic, and WebSocket handling
- For DB schema questions, read `db/schema.sql` (authoritative) not individual migrations
- For frontend state flow, trace: `TournamentContext.jsx` → `useServerSync.js` → WebSocket → `production-server.js`
- Leaderboard API proxy pattern: `leaderboard/src/lib/api.ts` calls Express, types in `leaderboard/src/lib/types.ts`
- When adding API endpoints: register in `production-server.js`, add client function in `src/utils/apiClient.js`, and if leaderboard needs it, add to `leaderboard/src/lib/api.ts`
- Deploy after every code change — the project instructions mandate it
