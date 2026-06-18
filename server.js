import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const PORT = 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '.data');
const STATE_FILE = join(DATA_DIR, 'tournament-state.json');
const MAX_AUDIT_LOG = 300;

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

function broadcast(data, exclude = null) {
  const json = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== exclude && client.readyState === 1) {
      try {
        client.send(json);
      } catch {}
    }
  });
}

function isStaleClientUpdate(msg) {
  if (typeof msg.version !== 'number') return false;
  return msg.version < Number(state.version || 0);
}

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

const state = loadState();
// Timer is ephemeral — never survive a server restart
state.timer = { remainingMs: 0, totalMs: 0, running: false, paused: false };
saveState();

const wss = new WebSocketServer({ port: PORT });
console.log(`[sync-server] WebSocket started on ws://localhost:${PORT}`);
console.log(`[sync-server] persistent state: ${STATE_FILE}`);

wss.on('connection', (ws) => {
  const id = `${Date.now() % 10000}-${Math.random().toString(16).slice(2, 6)}`;
  console.log(`[sync-server] client #${id} connected (total: ${wss.clients.size})`);

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
      console.error(`[sync-server] bad message from #${id}:`, e.message);
    }
  });

  ws.on('error', (e) => {
    console.error(`[sync-server] error on #${id}:`, e.message);
  });

  ws.on('close', () => {
    console.log(`[sync-server] client #${id} disconnected (total: ${wss.clients.size})`);
  });
});

wss.on('error', (e) => {
  console.error('[sync-server] server error:', e.message);
});

process.on('uncaughtException', (e) => {
  console.error('[sync-server] uncaughtException:', e.message);
  saveState();
});
process.on('unhandledRejection', (e) => {
  console.error('[sync-server] unhandledRejection:', e?.message || e);
  saveState();
});
