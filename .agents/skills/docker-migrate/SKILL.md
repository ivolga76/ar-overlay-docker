---
name: docker-migrate
description: Docker containerization of Node.js + Vite projects. Use when the user asks to Dockerize, containerize, or prepare a Docker deployment for a Node.js/React/Vite project. Covers Dockerfile (multi-stage), docker-compose, .dockerignore, install script, production server, and VPS deployment.
---

# Docker Migration Skill

Systematic containerization of Node.js + Vite projects for VPS deployment
(Debian/Ubuntu). Produces a production-ready Docker image with a single
Express server serving SPA static files, REST API, and WebSocket on one port.

## Phase 0 — Audit

Before writing any Docker file, audit the project:

1. Read `package.json` — dependencies, scripts, type (module/commonjs)
2. Read `vite.config.js` — dev server port, strictPort, base path
3. Read ALL source files touching API/WebSocket — find hardcoded localhost URLs
4. Read server entrypoint(s) — understand how HTTP + WS are started
5. Check for persistent data — `.data/`, `uploads/`, `sessions/` directories
6. Check for build output directory — `dist/`, `build/`, `out/`
7. List `public/` — static assets that must be served

## Phase 1 — Fix hardcoded URLs

Any hardcoded `http://localhost:PORT` in client code MUST be changed to
`window.location.origin` for production. In Docker, frontend and backend
share the same origin.

Pattern to fix:
```js
// BEFORE (dev only)
const API_BASE = 'http://localhost:3001';

// AFTER (works in both dev and Docker)
const API_BASE = import.meta.env.DEV
  ? 'http://localhost:3001'
  : window.location.origin;
```

Search for: `localhost:`, `127.0.0.1:`, hardcoded port numbers in client code.

Note: `import.meta.env.DEV` is set by Vite and tree-shaken in production builds.

## Phase 2 — Single production server

Create `production-server.js` — a single Node.js server that:
1. Serves static files from `dist/` (the SPA)
2. Handles `POST /api/*` and `GET /api/*` routes
3. Runs WebSocket server on the SAME HTTP server (no separate port)
4. CORS headers for production
5. SPA fallback: all non-API, non-static routes → `dist/index.html`

Template architecture:
```
Express
├── static files from dist/ (with caching headers)
├── API routes (/api/register, /api/login, /api/me, /api/change-password)
├── WebSocket upgrade on same server
└── SPA fallback (* → dist/index.html)
```

Reuse existing route handlers from `server.js` (extract to shared functions
or duplicate — prefer extracting to keep DRY).

## Phase 3 — Dockerfile

Multi-stage build:
```dockerfile
# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml ./
COPY --from=build /app/production-server.js ./
COPY --from=build /app/server.js ./
RUN pnpm install --prod --frozen-lockfile
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3001/api/me || exit 1
CMD ["node", "production-server.js"]
```

Key points:
- `corepack` for pnpm (no global install)
- `--prod` installs only `dependencies`, not `devDependencies`
- HEALTHCHECK uses `wget` (built into alpine)
- Server.js is copied for shared auth logic

## Phase 4 — docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - '3001:3001'
    volumes:
      - app_data:/app/.data
    restart: always
    environment:
      - NODE_ENV=production

volumes:
  app_data:
```

## Phase 5 — .dockerignore

Exclude everything that shouldn't be in the build context:
```
node_modules
dist
.data
.git
backups
*.ps1
*.bat
*.bundle
*.txt (except README*)
timer-demo.html
screenshot.mjs
```

## Phase 6 — Package.json scripts

Add to `scripts`:
```json
"production": "node production-server.js",
"docker:build": "docker compose build",
"docker:up": "docker compose up -d",
"docker:down": "docker compose down"
```

## Phase 7 — Install script (install.sh)

Single-command VPS setup:
```bash
#!/bin/bash
# AR Overlay Docker — one-command install for Debian/Ubuntu VPS
set -e

REPO="https://github.com/<USER>/ar-overlay-docker.git"
APP_DIR="/opt/ar-overlay"

echo "[1/4] Installing Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | bash
fi

echo "[2/4] Cloning repository..."
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR" && git pull
else
    git clone "$REPO" "$APP_DIR"
    cd "$APP_DIR"
fi

echo "[3/4] Building and starting..."
docker compose up -d --build

echo "[4/4] Done!"
echo "App running on http://$(curl -s ifconfig.me):3001"
```

## Phase 8 — Verification

After Docker migration, verify:
1. `docker compose up --build` succeeds
2. `curl http://localhost:3001/api/me` → 401 (auth required, server alive)
3. `curl http://localhost:3001/` → returns index.html (SPA)
4. `curl http://localhost:3001/overlay/some-id` → returns index.html (SPA fallback)
5. WebSocket: check that `ws://localhost:3001` connects (use wscat or browser)
6. Restart container: `docker compose restart` → data persists (volume)
7. Check `.data/` files inside container: `docker compose exec app ls .data/`

## Anti-patterns

- DO NOT use `vite preview` in production (dev server, no WebSocket)
- DO NOT expose separate ports for frontend/backend
- DO NOT hardcode `localhost` anywhere in production code
- DO NOT include `.data/` in the image (use volume)
- DO NOT use `npm` if project uses `pnpm` (lockfile mismatch)
