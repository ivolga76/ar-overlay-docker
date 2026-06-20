/**
 * production-server.template.js
 * 
 * Объединённый продакшен-сервер для AR Overlay:
 *   - Express раздаёт статику dist/
 *   - WebSocketServer синхронизирует оверлей с админкой
 *   - Один процесс = одна Windows-служба
 * 
 * Использование:
 *   1. Скопировать в корень проекта как production-server.js
 *   2. pnpm add express
 *   3. pnpm build
 *   4. nexe production-server.js --resource "dist/**" --output build/AR_Overlay_Server.exe
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { exec } from 'node:child_process';

// ── Конфигурация ──────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
// CJS/ESM dual-compat: __dirname built-in in CJS, fileURLToPath in ESM
const __dirname = (() => {
  if (typeof __dirname !== 'undefined') return __dirname;
  return dirname(fileURLToPath(import.meta.url));
})();
const MAX_AUDIT_LOG = 300;
const OPEN_BROWSER = process.env.NO_BROWSER !== '1';

// ── Пути ──────────────────────────────────────────────────────
// В nexe-сборке __dirname внутри виртуальной ФС, dist/ доступен read-only.
// .data/ пишется рядом с .exe, чтобы выживать между обновлениями.
const EXE_DIR = dirname(process.execPath);

// Статика: пробуем из бандла (nexe), иначе рядом с .exe
let DIST_DIR = join(__dirname, 'dist');
if (!existsSync(DIST_DIR)) {
  DIST_DIR = join(EXE_DIR, 'dist');
}
if (!existsSync(DIST_DIR)) {
  console.warn('[www] WARNING: dist/ not found — static files will 404');
}

// Данные состояния
const DATA_DIR = join(EXE_DIR, '.data');
const STATE_FILE = join(DATA_DIR, 'tournament-state.json');

// ── Состояние по умолчанию ───────────────────────────────────
const DEFAULT_STATE = {
  version: 0,
  tasks: [],
  players: [],
  teams: [],
  rounds: [],
  extensions: { bonusTasks: [], complications: [] },
  overlayLayout: [],
  mode: '1x1',
  currentRound: 1,
  currentPoints: 0,
  currentParticipantId: null,
  previousPlayerOrTeamId: null,
  showStandings: false,
  timer: { remainingMs: 0, totalMs: 0, running: false, paused: false },
  auditLog: [],
};

// ── Утилиты состояния ────────────────────────────────────────
function loadState() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    const raw = readFileSync(STATE_FILE, 'utf8');
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState() {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function addAudit(action, clientId, payload = {}) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    action,
    clientId,
    version: state.version,
    payload,
  };
  state.auditLog = [entry, ...(state.auditLog || [])].slice(0, MAX_AUDIT_LOG);
}

function bump(action, clientId, payload) {
  state.version = Number(state.version || 0) + 1;
  addAudit(action, clientId, payload);
  saveState();
}

function publicState() {
  const { timer, ...cleanState } = state;
  return cleanState;
}

function isStaleClientUpdate(msg) {
  if (typeof msg.version !== 'number') return false;
  return msg.version < Number(state.version || 0);
}

// ── Инициализация состояния ──────────────────────────────────
const state = loadState();
state.timer = { remainingMs: 0, totalMs: 0, running: false, paused: false };
saveState();

// ── Express (статика) ────────────────────────────────────────
const app = express();

// Сжатие и кеширование для статики
app.use(express.static(DIST_DIR, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// SPA fallback: все не-API маршруты → index.html
app.get(/^(?!\/ws).*/, (req, res, next) => {
  // Пропускаем WebSocket upgrade
  if (req.headers.upgrade) return next();
  res.sendFile(join(DIST_DIR, 'index.html'), (err) => {
    if (err) next();
  });
});

// ── HTTP + WebSocket на одном порту ──────────────────────────
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

function broadcast(data, exclude = null) {
  const json = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== exclude && client.readyState === 1) {
      try { client.send(json); } catch {}
    }
  });
}

// ── Игровые поля для синхронизации ──────────────────────────
const gameFields = [
  'mode',
  'currentRound',
  'currentPoints',
  'currentParticipantId',
  'tasks',
  'players',
  'teams',
  'showStandings',
  'extensions',
  'rounds',
  'previousPlayerOrTeamId',
  'overlayLayout',
  'totalRounds',
  'tournamentName',
  'soundEnabled',
];

// ── WebSocket-обработчики ────────────────────────────────────
wss.on('connection', (ws) => {
  const id = `${Date.now() % 10000}-${Math.random().toString(16).slice(2, 6)}`;
  console.log(`[sync] client #${id} connected (total: ${wss.clients.size})`);

  try {
    ws.send(JSON.stringify({ type: 'full', state: publicState(), version: state.version }));
    if (state.timer && (state.timer.running || state.timer.remainingMs > 0)) {
      ws.send(JSON.stringify({ type: 'timer', timer: { ...state.timer }, version: state.version }));
    }
  } catch {}

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      if (['full', 'update', 'updateTasks', 'timer'].includes(msg.type) && isStaleClientUpdate(msg)) {
        ws.send(JSON.stringify({
          type: 'conflict',
          reason: 'stale-version',
          serverVersion: state.version,
          state: publicState(),
        }));
        return;
      }

      switch (msg.type) {
        case 'full': {
          if (msg.state && Array.isArray(msg.state.tasks)) {
            for (const f of gameFields) {
              if (f in msg.state) state[f] = msg.state[f];
            }
            bump('full-state-replace', id, { fields: Object.keys(msg.state) });
            broadcast({ type: 'full', state: publicState(), version: state.version }, ws);
            ws.send(JSON.stringify({ type: 'ack', version: state.version }));
          }
          break;
        }
        case 'update': {
          if (msg.state) {
            for (const f of gameFields) {
              if (f in msg.state) state[f] = msg.state[f];
            }
            bump('state-update', id, { fields: Object.keys(msg.state) });
            broadcast({ type: 'update', state: msg.state, version: state.version }, ws);
            ws.send(JSON.stringify({ type: 'ack', version: state.version }));
          }
          break;
        }
        case 'updateTasks': {
          if (msg.tasks) {
            state.tasks = msg.tasks;
            bump('tasks-update', id, { count: msg.tasks.length });
            broadcast({ type: 'updateTasks', tasks: msg.tasks, version: state.version }, ws);
            ws.send(JSON.stringify({ type: 'ack', version: state.version }));
          }
          break;
        }
        case 'timer': {
          if (msg.timer) {
            state.timer = msg.timer;
            saveState();
            broadcast({ type: 'timer', timer: msg.timer, version: state.version }, ws);
          }
          break;
        }
      }
    } catch (e) {
      console.error(`[sync] bad message from #${id}:`, e.message);
    }
  });

  ws.on('error', (e) => {
    console.error(`[sync] error on #${id}:`, e.message);
  });

  ws.on('close', () => {
    console.log(`[sync] client #${id} disconnected (total: ${wss.clients.size})`);
  });
});

wss.on('error', (e) => {
  console.error('[sync] server error:', e.message);
});

// ── Старт ────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  █▀▀█ █▀▀█   █▀▀█ █░░█ █▀▀ █▀▀█ █░░ █▀▀█ █░░█`);
  console.log(`  █▄▄█ █▄▄▀   █░░█ █▀▀█ █▀▀ █▄▄▀ █░░ █▄▄█ █▄▄█`);
  console.log(`  █▀▀▀ █░▀▄   █▀▀▀ █░░█ █▄▄ █░▀▄ █▄▄ █░░█ ▄▄▄█`);
  console.log(`\n  AR Overlay Server v1.0`);
  console.log(`  Static files:  ${DIST_DIR}`);
  console.log(`  Data:          ${DATA_DIR}`);
  console.log(`  WebSocket:     ws://localhost:${PORT}`);
  console.log(`  Admin:         http://localhost:${PORT}/admin`);
  console.log(`  Overlay:       http://localhost:${PORT}/overlay`);
  console.log(`\n  Press Ctrl+C to stop\n`);
});

// ── Graceful shutdown ────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n[sync] Shutting down...');
  saveState();
  wss.close(() => {
    httpServer.close(() => process.exit(0));
  });
});

process.on('uncaughtException', (e) => {
  console.error('[sync] uncaughtException:', e.message);
  saveState();
});

process.on('unhandledRejection', (e) => {
  console.error('[sync] unhandledRejection:', e?.message || e);
});

// ── Открыть браузер (опционально) ───────────────────────────
if (OPEN_BROWSER) {
  setTimeout(() => {
    const url = `http://localhost:${PORT}/admin`;
    const cmd = process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
    exec(cmd, () => {});
  }, 1500);
}
