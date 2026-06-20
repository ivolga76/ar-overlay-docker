import express from 'express';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { WebSocketServer } from 'ws';

const PORT = 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '.data');
const STATE_DIR = join(DATA_DIR, 'state');
const USERS_FILE = join(DATA_DIR, 'users.json');
const SESSIONS_FILE = join(DATA_DIR, 'sessions.json');
const MAX_AUDIT_LOG = 300;
const DIST_DIR = join(__dirname, 'dist');

// ── Helpers ──────────────────────────────────────────────────

function readJson(path, fallback = null) {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

// ── Auth store ───────────────────────────────────────────────

let users = readJson(USERS_FILE, []);
let sessions = readJson(SESSIONS_FILE, []);

function saveUsers() { writeJson(USERS_FILE, users); }
function saveSessions() { writeJson(SESSIONS_FILE, sessions); }

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString('hex');
}

function findUserByEmail(email) {
  return users.find((u) => u.email === email.toLowerCase().trim()) || null;
}

function findSession(token) {
  return sessions.find((s) => s.token === token) || null;
}

function authenticate(req) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  const session = findSession(token);
  if (!session) return null;
  return users.find((u) => u.id === session.userId) || null;
}

// ── Per-user tournament state ────────────────────────────────

const DEFAULT_STATE = {
  version: 0,
  tasks: [],
  players: [
    { id: 'p-1', name: 'Alex', totalPoints: 0 },
    { id: 'p-2', name: 'Sam', totalPoints: 0 },
  ],
  teams: [
    {
      id: 't-1',
      name: 'North Gate',
      players: [
        { id: 'p-1', name: 'Alex', totalPoints: 0 },
        { id: 'p-2', name: 'Sam', totalPoints: 0 },
      ],
      totalPoints: 0,
    },
  ],
  rounds: [],
  extensions: { bonusTasks: [], complications: [] },
  overlayLayout: [
    { id: 'tasks', type: 'tasks', x: 1300, y: 7, scale: 1.0, visible: true },
    { id: 'tournament-name', type: 'tournament-name', x: 10, y: 2, scale: 1.0, visible: true },
    { id: 'round', type: 'round', x: 11, y: 36, scale: 1.0, visible: true },
    { id: 'score', type: 'score', x: 474, y: 953, scale: 1.2, visible: true },
    { id: 'timer', type: 'timer', x: 856, y: 886, scale: 1.0, visible: true },
    { id: 'previous-player', type: 'previous-player', x: 1584, y: 930, scale: 1.25, visible: true },
    { id: 'standings', type: 'standings', x: 1480, y: 100, scale: 1.2, visible: false },
    { id: 'complications', type: 'complications', x: 1300, y: 244, scale: 1.0, visible: true },
  ],
  mode: '1x1',
  currentRound: 1,
  totalRounds: 3,
  tournamentName: 'Битва за Респект',
  soundEnabled: true,
  currentPoints: 0,
  currentParticipantId: 'p-1',
  previousPlayerOrTeamId: 'p-2',
  showStandings: false,
  timer: { remainingMs: 0, totalMs: 0, running: false, paused: false },
  auditLog: [],
};

const gameFields = [
  'mode', 'currentRound', 'currentPoints', 'currentParticipantId',
  'tasks', 'players', 'teams', 'showStandings', 'extensions', 'rounds',
  'previousPlayerOrTeamId', 'overlayLayout', 'totalRounds', 'tournamentName', 'soundEnabled',
];

const userStates = new Map();

function stateFile(userId) {
  return join(STATE_DIR, `${userId}.json`);
}

function loadState(userId) {
  const cached = userStates.get(userId);
  if (cached) return cached;
  try {
    mkdirSync(STATE_DIR, { recursive: true });
    if (!existsSync(stateFile(userId))) {
      const fresh = { ...DEFAULT_STATE };
      userStates.set(userId, fresh);
      saveState(userId);
      return fresh;
    }
    const raw = readFileSync(stateFile(userId), 'utf8');
    const parsed = { ...DEFAULT_STATE, ...JSON.parse(raw) };
    parsed.timer = { remainingMs: 0, totalMs: 0, running: false, paused: false };
    userStates.set(userId, parsed);
    return parsed;
  } catch {
    const fresh = { ...DEFAULT_STATE };
    userStates.set(userId, fresh);
    saveState(userId);
    return fresh;
  }
}

function saveState(userId) {
  const st = userStates.get(userId);
  if (!st) return;
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(stateFile(userId), JSON.stringify(st, null, 2), 'utf8');
}

function addAudit(userId, action, clientId, payload = {}) {
  const st = userStates.get(userId);
  if (!st) return;
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    action,
    clientId,
    version: st.version,
    payload,
  };
  st.auditLog = [entry, ...(st.auditLog || [])].slice(0, MAX_AUDIT_LOG);
}

function bump(userId, action, clientId, payload) {
  const st = userStates.get(userId);
  if (!st) return;
  st.version = Number(st.version || 0) + 1;
  addAudit(userId, action, clientId, payload);
  saveState(userId);
}

function publicState(userId) {
  const st = userStates.get(userId);
  if (!st) return { ...DEFAULT_STATE };
  const { timer, ...cleanState } = st;
  return cleanState;
}

function isStaleClientUpdate(userId, msg) {
  if (typeof msg.version !== 'number') return false;
  const st = userStates.get(userId);
  if (!st) return false;
  return msg.version < Number(st.version || 0);
}

// ── Migration (run once) ─────────────────────────────────────

function migrateGlobalState() {
  const oldFile = join(DATA_DIR, 'tournament-state.json');
  if (!existsSync(oldFile)) return;

  try {
    const globalState = JSON.parse(readFileSync(oldFile, 'utf8'));
    if (!globalState || Object.keys(globalState).length <= 2) {
      console.log('[migrate] global state empty, skipping');
      return;
    }

    let migrated = 0;
    for (const user of users) {
      const sf = stateFile(user.id);
      if (existsSync(sf)) continue;

      const userState = {
        ...DEFAULT_STATE,
        ...JSON.parse(JSON.stringify(globalState)),
        version: 1,
        timer: { remainingMs: 0, totalMs: 0, running: false, paused: false },
      };
      writeJson(sf, userState);
      console.log(`[migrate] created state for user: ${user.email}`);
      migrated++;
    }

    if (migrated > 0) {
      const backupFile = join(DATA_DIR, 'tournament-state.json.backup');
      writeFileSync(backupFile, readFileSync(oldFile));
      writeFileSync(oldFile, JSON.stringify({ migrated: true, at: new Date().toISOString(), to: migrated }));
      console.log(`[migrate] done: ${migrated} user(s), backup saved`);
    }
  } catch (e) {
    console.error('[migrate] error:', e.message);
  }
}

migrateGlobalState();

// ── Express app ──────────────────────────────────────────────

const app = express();
app.use(express.json());
app.disable('x-powered-by');

// CORS — allow any origin in production (overlay is embedded in OBS)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// ── Auth routes ──────────────────────────────────────────────

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }
  const cleanEmail = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Некорректный email' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
  }
  if (findUserByEmail(cleanEmail)) {
    return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
  }

  const salt = randomBytes(16).toString('hex');
  const user = {
    id: randomUUID(),
    email: cleanEmail,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers();

  const token = randomUUID();
  sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  saveSessions();

  console.log(`[auth] registered user: ${cleanEmail}`);
  res.status(201).json({ token, user: { email: user.email, id: user.id } });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const user = findUserByEmail(cleanEmail);
  if (!user) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  const hash = hashPassword(password, user.salt);
  if (!timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.passwordHash, 'hex'))) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  const token = randomUUID();
  sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  saveSessions();

  console.log(`[auth] login: ${cleanEmail}`);
  res.status(200).json({ token, user: { email: user.email, id: user.id } });
});

app.get('/api/me', (req, res) => {
  const user = authenticate(req);
  if (!user) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  res.json({ user: { email: user.email, id: user.id } });
});

app.post('/api/change-password', async (req, res) => {
  const user = authenticate(req);
  if (!user) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Текущий и новый пароль обязательны' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Новый пароль должен быть не менее 6 символов' });
  }

  const oldHash = hashPassword(oldPassword, user.salt);
  if (!timingSafeEqual(Buffer.from(oldHash, 'hex'), Buffer.from(user.passwordHash, 'hex'))) {
    return res.status(403).json({ error: 'Неверный текущий пароль' });
  }

  const newSalt = randomBytes(16).toString('hex');
  user.salt = newSalt;
  user.passwordHash = hashPassword(newPassword, newSalt);
  saveUsers();

  sessions = sessions.filter((s) => s.userId !== user.id);
  saveSessions();

  console.log(`[auth] password changed: ${user.email}`);
  res.json({ ok: true });
});

// ── Serve static files from dist/ ────────────────────────────

app.use(express.static(DIST_DIR, {
  maxAge: '1h',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// ── SPA fallback — all non-API routes → index.html ───────────

app.get('*', (req, res) => {
  const indexPath = join(DIST_DIR, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('AR Overlay Server — build not found. Run `pnpm build` first.');
  }
});

// ── HTTP server + WebSocket ──────────────────────────────────

const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer });

console.log(`[production-server] HTTP + WebSocket starting on port ${PORT}`);
console.log(`[production-server] per-user state: ${STATE_DIR}/`);

wss.on('connection', (ws) => {
  const id = `${Date.now() % 10000}-${Math.random().toString(16).slice(2, 6)}`;
  ws.userId = null;
  ws.subscribedUserId = null;
  ws.authenticated = false;

  console.log(`[sync] client #${id} connected (total: ${wss.clients.size})`);

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === 'auth') {
      const session = msg.token ? findSession(msg.token) : null;
      if (session) {
        ws.authenticated = true;
        ws.userId = session.userId;
        ws.send(JSON.stringify({ type: 'auth', ok: true, userId: session.userId }));
        loadState(ws.userId);
        const st = userStates.get(ws.userId);
        ws.send(JSON.stringify({ type: 'full', state: publicState(ws.userId), version: st ? st.version : 0 }));
        if (st && st.timer && (st.timer.running || st.timer.remainingMs > 0)) {
          ws.send(JSON.stringify({ type: 'timer', timer: { ...st.timer }, version: st.version }));
        }
        console.log(`[sync] client #${id} authenticated as user ${ws.userId}`);
      } else {
        ws.send(JSON.stringify({ type: 'auth', ok: false }));
        console.log(`[sync] client #${id} auth failed`);
      }
      return;
    }

    if (msg.type === 'subscribe') {
      const targetUserId = msg.userId;
      if (!targetUserId) {
        ws.send(JSON.stringify({ type: 'error', reason: 'bad-subscribe', message: 'userId required' }));
        return;
      }
      ws.subscribedUserId = targetUserId;
      loadState(targetUserId);
      const st = userStates.get(targetUserId);
      ws.send(JSON.stringify({ type: 'full', state: publicState(targetUserId), version: st ? st.version : 0 }));
      if (st && st.timer && (st.timer.running || st.timer.remainingMs > 0)) {
        ws.send(JSON.stringify({ type: 'timer', timer: { ...st.timer }, version: st.version }));
      }
      console.log(`[sync] client #${id} subscribed to user ${targetUserId}`);
      return;
    }

    const effectiveUserId = ws.authenticated ? ws.userId : ws.subscribedUserId;
    if (!effectiveUserId) {
      if (['full', 'update', 'updateTasks', 'timer'].includes(msg.type)) {
        ws.send(JSON.stringify({
          type: 'error',
          reason: 'unauthorized',
          message: 'Требуется авторизация или подписка. Отправьте { type: "auth", token } или { type: "subscribe", userId }',
        }));
      }
      return;
    }

    loadState(effectiveUserId);

    if (['full', 'update', 'updateTasks', 'timer'].includes(msg.type) && isStaleClientUpdate(effectiveUserId, msg)) {
      ws.send(JSON.stringify({
        type: 'conflict',
        reason: 'stale-version',
        serverVersion: userStates.get(effectiveUserId)?.version || 0,
        state: publicState(effectiveUserId),
      }));
      return;
    }

    switch (msg.type) {
      case 'full': {
        if (msg.state && Array.isArray(msg.state.tasks) && ws.authenticated) {
          const st = userStates.get(effectiveUserId);
          for (const f of gameFields) {
            if (f in msg.state) st[f] = msg.state[f];
          }
          bump(effectiveUserId, 'full-state-replace', id, { fields: Object.keys(msg.state) });
          broadcast({ type: 'full', state: publicState(effectiveUserId), version: st.version }, effectiveUserId);
          ws.send(JSON.stringify({ type: 'ack', version: st.version }));
        }
        break;
      }
      case 'update': {
        if (msg.state && ws.authenticated) {
          const st = userStates.get(effectiveUserId);
          for (const f of gameFields) {
            if (f in msg.state) st[f] = msg.state[f];
          }
          bump(effectiveUserId, 'state-update', id, { fields: Object.keys(msg.state) });
          broadcast({ type: 'update', state: msg.state, version: st.version }, effectiveUserId);
          ws.send(JSON.stringify({ type: 'ack', version: st.version }));
        }
        break;
      }
      case 'updateTasks': {
        if (msg.tasks && ws.authenticated) {
          const st = userStates.get(effectiveUserId);
          st.tasks = msg.tasks;
          bump(effectiveUserId, 'tasks-update', id, { count: msg.tasks.length });
          broadcast({ type: 'updateTasks', tasks: msg.tasks, version: st.version }, effectiveUserId);
          ws.send(JSON.stringify({ type: 'ack', version: st.version }));
        }
        break;
      }
      case 'timer': {
        if (msg.timer && ws.authenticated) {
          const st = userStates.get(effectiveUserId);
          st.timer = msg.timer;
          saveState(effectiveUserId);
          broadcast({ type: 'timer', timer: msg.timer, version: st.version }, effectiveUserId);
        }
        break;
      }
    }
  });

  ws.on('error', (e) => {
    console.error(`[sync] error on #${id}:`, e.message);
  });

  ws.on('close', () => {
    console.log(`[sync] client #${id} disconnected (total: ${wss.clients.size})`);
  });
});

function broadcast(data, userId) {
  const json = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState !== 1) return;
    const matchAuth = client.authenticated && client.userId === userId;
    const matchSub = !client.authenticated && client.subscribedUserId === userId;
    if (matchAuth || matchSub) {
      try { client.send(json); } catch (_) {}
    }
  });
}

// ── Start ────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[production-server] listening on http://0.0.0.0:${PORT}`);
});

process.on('uncaughtException', (e) => {
  console.error('[production-server] uncaughtException:', e.message);
  for (const [userId] of userStates) {
    try { saveState(userId); } catch (_) {}
  }
});
process.on('unhandledRejection', (e) => {
  console.error('[production-server] unhandledRejection:', e?.message || e);
});
