import express from 'express';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { initDatabase, getDb, query, queryOne, run, closeDatabase, saveToDisk } from './db/connection.js';
import { migrate } from './db/migrate.js';
import { DEFAULT_STATE, GAME_FIELDS } from './shared/state-fields.js';

const PORT = 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '.data');
const STATE_DIR = join(DATA_DIR, 'state');
const MAX_AUDIT_LOG = 300;
const DIST_DIR = join(__dirname, 'dist');

// ── Helpers ──────────────────────────────────────────────────

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

// ── Auth store (SQLite) ───────────────────────────────────────

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString('hex');
}

function findUserByEmail(email) {
  const rows = query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  return rows[0] || null;
}

const SESSION_TTL_DAYS = 30;

function findSession(token) {
  const rows = query(
    `SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')`,
    [token]
  );
  return rows[0] || null;
}

/** Clean up expired sessions — call periodically */
function cleanupExpiredSessions() {
  const result = run("DELETE FROM sessions WHERE expires_at <= datetime('now')");
  if (result.changes > 0) {
    saveToDisk();
    console.log(`[auth] cleaned up ${result.changes} expired session(s)`);
  }
}

function authenticate(req) {
  // 1. Try Authorization header (SPA admin, API clients)
  const header = req.headers['authorization'];
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    const session = findSession(token);
    if (session) return findUserById(session.user_id);
  }

  // 2. Try cookie (leaderboard admin)
  const cookieHeader = req.headers['cookie'];
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)admin_token=([^;]+)/);
    if (match) {
      const session = findSession(match[1]);
      if (session) return findUserById(session.user_id);
    }
  }

  return null;
}

function findUserById(id) {
  const rows = query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

// ── Per-user tournament state (imported from shared module) ──

const gameFields = GAME_FIELDS;

// ── Player identity helper ────────────────────────────────────

/** Find or create a player record by display_name. Returns the player row. */
function findOrCreatePlayer(name) {
  const playerName = (name || '').trim();
  if (!playerName) return null;
  let player = queryOne('SELECT * FROM players WHERE display_name = ?', [playerName]);
  if (!player) {
    const id = randomUUID();
    run('INSERT INTO players (id, display_name) VALUES (?, ?)', [id, playerName]);
    player = queryOne('SELECT * FROM players WHERE id = ?', [id]);
  }
  return player;
}

const userStates = new Map();
const userLastAccess = new Map(); // userId → timestamp for TTL cleanup

// ── Rate limiter (in-memory, per-IP) ──────────────────────────
const rateLimitMap = new Map(); // ip → { count, resetAt }
const RATE_LIMIT_MAX = 20;       // max requests
const RATE_LIMIT_WINDOW = 60000; // per 60 seconds

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX - entry.count));
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Слишком много запросов. Попробуйте позже.' });
  }
  next();
}

// Periodic cleanup of rate limit map (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 300000).unref();

// ── userStates TTL cleanup (30 min inactivity) ────────────────
function touchAccess(userId) {
  userLastAccess.set(userId, Date.now());
}

setInterval(() => {
  const now = Date.now();
  const TTL = 30 * 60 * 1000; // 30 minutes
  for (const [userId, lastAccess] of userLastAccess) {
    if (now - lastAccess > TTL) {
      saveStateNow(userId);
      userStates.delete(userId);
      userLastAccess.delete(userId);
      console.log(`[state] cleaned up inactive user: ${userId}`);
    }
  }
}, 600000).unref(); // every 10 minutes

function stateFile(userId) {
  return join(STATE_DIR, `${userId}.json`);
}

function loadState(userId) {
  const cached = userStates.get(userId);
  if (cached) { touchAccess(userId); return cached; }
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
    parsed.timer = {
      remainingMs: 0,
      totalMs: parsed.timer?.totalMs ?? 0,
      running: false,
      paused: false,
    };
    userStates.set(userId, parsed);
    touchAccess(userId);
    return parsed;
  } catch {
    const fresh = { ...DEFAULT_STATE };
    userStates.set(userId, fresh);
    saveState(userId);
    return fresh;
  }
}

// ── Debounced async state persistence (avoids blocking event loop on SD cards) ──
const saveTimers = new Map();    // userId -> setTimeout handle
const savePending = new Map();   // userId -> latest state snapshot

function scheduleSave(userId) {
  if (saveTimers.has(userId)) {
    clearTimeout(saveTimers.get(userId));
  }
  saveTimers.set(userId, setTimeout(() => {
    saveTimers.delete(userId);
    const st = savePending.get(userId);
    savePending.delete(userId);
    if (!st) return;
    const file = stateFile(userId);
    mkdirSync(STATE_DIR, { recursive: true });
    writeFile(file, JSON.stringify(st, null, 2), 'utf8').catch(err => {
      console.error(`[state] failed to save ${userId}:`, err.message);
    });
  }, 1000));
}

function saveState(userId) {
  const st = userStates.get(userId);
  if (!st) return;
  savePending.set(userId, { ...st });
  scheduleSave(userId);
}

/** Force immediate save for a user — blocks until written */
function saveStateNow(userId) {
  if (saveTimers.has(userId)) {
    clearTimeout(saveTimers.get(userId));
    saveTimers.delete(userId);
  }
  savePending.delete(userId);
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

    // Get all users from SQLite (after migration 002 has run)
    const allUsers = query('SELECT id, email FROM users');
    let migrated = 0;
    for (const user of allUsers) {
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

// migrateGlobalState() — called after DB init, see start() below

// ── Express app ──────────────────────────────────────────────

const app = express();
app.use(express.json());
app.disable('x-powered-by');

// CORS — allow any origin in production (overlay is embedded in OBS)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// ── Auth routes ──────────────────────────────────────────────

app.post('/api/register', rateLimit, async (req, res) => {
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
  const userId = randomUUID();
  const now = new Date().toISOString();
  run(
    'INSERT INTO users (id, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)',
    [userId, cleanEmail, hashPassword(password, salt), salt, now]
  );

  const token = randomUUID();
  run(
    `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, datetime('now', '+${SESSION_TTL_DAYS} days'))`,
    [token, userId, now]
  );
  saveToDisk();

  console.log(`[auth] registered user: ${cleanEmail}`);
  res.status(201).json({ token, user: { email: cleanEmail, id: userId } });
});

app.post('/api/login', rateLimit, async (req, res) => {
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
  if (!timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.password_hash, 'hex'))) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  const token = randomUUID();
  run(
    `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, datetime('now', '+${SESSION_TTL_DAYS} days'))`,
    [token, user.id, new Date().toISOString()]
  );
  saveToDisk();

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

app.post('/api/change-password', rateLimit, async (req, res) => {
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
  if (!timingSafeEqual(Buffer.from(oldHash, 'hex'), Buffer.from(user.password_hash, 'hex'))) {
    return res.status(403).json({ error: 'Неверный текущий пароль' });
  }

  const newSalt = randomBytes(16).toString('hex');
  const newHash = hashPassword(newPassword, newSalt);
  run('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?',
    [newHash, newSalt, new Date().toISOString(), user.id]);

  // Invalidate all sessions for this user
  run('DELETE FROM sessions WHERE user_id = ?', [user.id]);
  saveToDisk();

  console.log(`[auth] password changed: ${user.email}`);
  res.json({ ok: true });
});

// ── Auth helpers ───────────────────────────────────────────────

function requireAuth(req, res) {
  const user = authenticate(req);
  if (!user) {
    res.status(401).json({ error: 'Не авторизован' });
    return null;
  }
  return user;
}

function requireOwnership(req, res, tournamentId) {
  const user = requireAuth(req, res);
  if (!user) return null;

  const tournament = queryOne('SELECT * FROM tournaments WHERE id = ?', [tournamentId]);
  if (!tournament) {
    res.status(404).json({ error: 'Турнир не найден' });
    return null;
  }
  if (tournament.user_id !== user.id) {
    res.status(403).json({ error: 'Доступ запрещён' });
    return null;
  }
  return { user, tournament };
}

// ── Tournament CRUD ────────────────────────────────────────────

// POST /api/tournaments — create tournament
app.post('/api/tournaments', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const { name, mode, totalRounds, season_id, participants, tasks } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Название турнира обязательно' });
  }

  if (mode && mode !== '1x1' && mode !== '2x2') {
    return res.status(400).json({ error: 'Режим должен быть 1x1 или 2x2' });
  }
  const tournamentMode = mode === '2x2' ? '2x2' : '1x1';
  const rounds = Math.max(1, Math.min(20, parseInt(totalRounds) || 3));
  const tournamentId = randomUUID();
  const now = new Date().toISOString();

  // Resolve season: use provided season_id, or default to latest active season
  let resolvedSeasonId = season_id || null;
  if (!resolvedSeasonId) {
    const latestSeason = queryOne(
      "SELECT id FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1"
    );
    resolvedSeasonId = latestSeason?.id || null;
  }

  run(
    'INSERT INTO tournaments (id, user_id, season_id, name, mode, status, total_rounds) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [tournamentId, user.id, resolvedSeasonId, name.trim(), tournamentMode, 'draft', rounds]
  );

  // Create participants
  if (Array.isArray(participants) && participants.length > 0) {
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const pid = randomUUID();
      const player = findOrCreatePlayer(p.name);
      run(
        'INSERT INTO tournament_participants (id, tournament_id, player_id, name, type, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [pid, tournamentId, player?.id || null, p.name || `Участник ${i + 1}`, p.type || 'player', i]
      );
      if (p.type === 'team' && Array.isArray(p.players)) {
        for (let j = 0; j < p.players.length; j++) {
          const pn = typeof p.players[j] === 'string' ? p.players[j] : p.players[j].name;
          // Link team members to players table too
          const memberPlayer = findOrCreatePlayer(pn);
          run(
            'INSERT INTO participant_members (participant_id, player_name, sort_order) VALUES (?, ?, ?)',
            [pid, pn || `Игрок ${j + 1}`, j]
          );
        }
      }
    }
  } else {
    // Default participants
    if (tournamentMode === '1x1') {
      for (let i = 0; i < 2; i++) {
        const name = `Игрок ${i + 1}`;
        const player = findOrCreatePlayer(name);
        run(
          'INSERT INTO tournament_participants (id, tournament_id, player_id, name, type, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          [randomUUID(), tournamentId, player?.id || null, name, 'player', i]
        );
      }
    } else {
      for (let i = 0; i < 2; i++) {
        const pid = randomUUID();
        const teamName = `Команда ${i + 1}`;
        run(
          'INSERT INTO tournament_participants (id, tournament_id, player_id, name, type, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          [pid, tournamentId, null, teamName, 'team', i]
        );
        for (let j = 0; j < 2; j++) {
          const memberName = `Игрок ${j + 1}`;
          const memberPlayer = findOrCreatePlayer(memberName);
          run(
            'INSERT INTO participant_members (participant_id, player_name, sort_order) VALUES (?, ?, ?)',
            [pid, memberName, j]
          );
        }
      }
    }
  }

  // Create tasks if provided
  if (Array.isArray(tasks) && tasks.length > 0) {
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      run(
        'INSERT INTO tournament_tasks (id, tournament_id, text, points, sort_order) VALUES (?, ?, ?, ?, ?)',
        [randomUUID(), tournamentId, t.text || String(t), t.points || 1, i]
      );
    }
  }

  saveToDisk();

  const created = queryOne('SELECT * FROM tournaments WHERE id = ?', [tournamentId]);
  broadcastTournaments(user.id);
  console.log(`[api] tournament created: "${name}" by ${user.email}`);
  res.status(201).json({ tournament: created });
});

// GET /api/tournaments — list user's tournaments (with optional season filter)
app.get('/api/tournaments', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const { season_id } = req.query;
  let sql = 'SELECT * FROM tournaments WHERE user_id = ?';
  const params = [user.id];

  if (season_id) {
    sql += ' AND season_id = ?';
    params.push(season_id);
  }

  sql += ' ORDER BY created_at DESC';
  const tournaments = query(sql, params);
  res.json({ tournaments });
});

// GET /api/tournaments/:id — tournament details
app.get('/api/tournaments/:id', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;

  const { tournament } = owner;

  const participants = query(
    'SELECT * FROM tournament_participants WHERE tournament_id = ? ORDER BY sort_order',
    [tournament.id]
  );
  for (const p of participants) {
    if (p.type === 'team') {
      p.players = query(
        'SELECT player_name as name FROM participant_members WHERE participant_id = ? ORDER BY sort_order',
        [p.id]
      );
    }
  }

  const tasks = query(
    'SELECT * FROM tournament_tasks WHERE tournament_id = ? ORDER BY sort_order',
    [tournament.id]
  );
  const complications = query(
    'SELECT * FROM tournament_complications WHERE tournament_id = ? ORDER BY sort_order',
    [tournament.id]
  );
  const bonusTasks = query(
    'SELECT * FROM tournament_bonus_tasks WHERE tournament_id = ? ORDER BY sort_order',
    [tournament.id]
  );
  const rounds = query(
    'SELECT * FROM round_results WHERE tournament_id = ? ORDER BY round_number, created_at',
    [tournament.id]
  );
  const standings = query(
    `SELECT ts.*, tp.name as participant_name, tp.type as participant_type
     FROM tournament_standings ts
     JOIN tournament_participants tp ON ts.participant_id = tp.id
     WHERE ts.tournament_id = ?
     ORDER BY ts.rank`,
    [tournament.id]
  );

  res.json({
    tournament,
    participants,
    tasks,
    complications,
    bonusTasks,
    rounds,
    standings,
  });
});

// PUT /api/tournaments/:id — update tournament
app.put('/api/tournaments/:id', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;

  const { tournament } = owner;
  const { name, mode, totalRounds } = req.body || {};

  const updates = [];
  const params = [];

  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'Название не может быть пустым' });
    updates.push('name = ?');
    params.push(name.trim());
  }
  if (mode !== undefined) {
    if (mode !== '1x1' && mode !== '2x2') return res.status(400).json({ error: 'Режим должен быть 1x1 или 2x2' });
    updates.push('mode = ?');
    params.push(mode);
  }
  if (totalRounds !== undefined) {
    const rounds = Math.max(1, Math.min(20, parseInt(totalRounds)));
    updates.push('total_rounds = ?');
    params.push(rounds);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Нет полей для обновления' });
  }

  params.push(tournament.id);
  run(`UPDATE tournaments SET ${updates.join(', ')} WHERE id = ?`, params);
  saveToDisk();

  const updated = queryOne('SELECT * FROM tournaments WHERE id = ?', [tournament.id]);
  broadcastTournaments(owner.user.id);
  console.log(`[api] tournament updated: "${updated.name}"`);
  res.json({ tournament: updated });
});

// DELETE /api/tournaments/:id — delete tournament (draft only)
app.delete('/api/tournaments/:id', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;

  const { tournament } = owner;

  if (tournament.status !== 'draft') {
    return res.status(400).json({ error: 'Можно удалить только черновик турнира' });
  }

  run('DELETE FROM tournaments WHERE id = ?', [tournament.id]);
  saveToDisk();

  broadcastTournaments(owner.user.id);
  console.log(`[api] tournament deleted: "${tournament.name}"`);
  res.json({ ok: true });
});

// ── Tournament complications CRUD ───────────────────────────────

// GET /api/tournaments/:id/complications
app.get('/api/tournaments/:id/complications', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;
  const complications = query(
    'SELECT * FROM tournament_complications WHERE tournament_id = ? ORDER BY sort_order',
    [owner.tournament.id]
  );
  res.json({ complications });
});

// POST /api/tournaments/:id/complications
app.post('/api/tournaments/:id/complications', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'Текст обязателен' });
  const id = randomUUID();
  const maxOrder = queryOne(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM tournament_complications WHERE tournament_id = ?',
    [owner.tournament.id]
  );
  run(
    'INSERT INTO tournament_complications (id, tournament_id, text, sort_order) VALUES (?, ?, ?, ?)',
    [id, owner.tournament.id, text.trim(), maxOrder?.next || 0]
  );
  saveToDisk();
  const created = queryOne('SELECT * FROM tournament_complications WHERE id = ?', [id]);
  res.status(201).json({ complication: created });
});

// PUT /api/complications/:id
app.put('/api/complications/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const c = queryOne(
    'SELECT tc.*, t.user_id FROM tournament_complications tc JOIN tournaments t ON tc.tournament_id = t.id WHERE tc.id = ?',
    [req.params.id]
  );
  if (!c) return res.status(404).json({ error: 'Не найдено' });
  if (c.user_id !== user.id) return res.status(403).json({ error: 'Доступ запрещён' });
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'Текст обязателен' });
  run('UPDATE tournament_complications SET text = ? WHERE id = ?', [text.trim(), c.id]);
  saveToDisk();
  res.json({ complication: queryOne('SELECT * FROM tournament_complications WHERE id = ?', [c.id]) });
});

// DELETE /api/complications/:id
app.delete('/api/complications/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const c = queryOne(
    'SELECT tc.*, t.user_id FROM tournament_complications tc JOIN tournaments t ON tc.tournament_id = t.id WHERE tc.id = ?',
    [req.params.id]
  );
  if (!c) return res.status(404).json({ error: 'Не найдено' });
  if (c.user_id !== user.id) return res.status(403).json({ error: 'Доступ запрещён' });
  run('DELETE FROM tournament_complications WHERE id = ?', [c.id]);
  saveToDisk();
  res.json({ ok: true });
});

// ── Tournament bonus tasks CRUD ─────────────────────────────────

// GET /api/tournaments/:id/bonus-tasks
app.get('/api/tournaments/:id/bonus-tasks', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;
  const bonusTasks = query(
    'SELECT * FROM tournament_bonus_tasks WHERE tournament_id = ? ORDER BY sort_order',
    [owner.tournament.id]
  );
  res.json({ bonusTasks });
});

// POST /api/tournaments/:id/bonus-tasks
app.post('/api/tournaments/:id/bonus-tasks', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;
  const { text, points } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'Текст обязателен' });
  const id = randomUUID();
  const maxOrder = queryOne(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM tournament_bonus_tasks WHERE tournament_id = ?',
    [owner.tournament.id]
  );
  run(
    'INSERT INTO tournament_bonus_tasks (id, tournament_id, text, points, sort_order) VALUES (?, ?, ?, ?, ?)',
    [id, owner.tournament.id, text.trim(), points || 2, maxOrder?.next || 0]
  );
  saveToDisk();
  const created = queryOne('SELECT * FROM tournament_bonus_tasks WHERE id = ?', [id]);
  res.status(201).json({ bonusTask: created });
});

// PUT /api/bonus-tasks/:id
app.put('/api/bonus-tasks/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const bt = queryOne(
    'SELECT tb.*, t.user_id FROM tournament_bonus_tasks tb JOIN tournaments t ON tb.tournament_id = t.id WHERE tb.id = ?',
    [req.params.id]
  );
  if (!bt) return res.status(404).json({ error: 'Не найдено' });
  if (bt.user_id !== user.id) return res.status(403).json({ error: 'Доступ запрещён' });
  const { text, points } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'Текст обязателен' });
  run('UPDATE tournament_bonus_tasks SET text = ?, points = ? WHERE id = ?', [text.trim(), points ?? bt.points, bt.id]);
  saveToDisk();
  res.json({ bonusTask: queryOne('SELECT * FROM tournament_bonus_tasks WHERE id = ?', [bt.id]) });
});

// DELETE /api/bonus-tasks/:id
app.delete('/api/bonus-tasks/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const bt = queryOne(
    'SELECT tb.*, t.user_id FROM tournament_bonus_tasks tb JOIN tournaments t ON tb.tournament_id = t.id WHERE tb.id = ?',
    [req.params.id]
  );
  if (!bt) return res.status(404).json({ error: 'Не найдено' });
  if (bt.user_id !== user.id) return res.status(403).json({ error: 'Доступ запрещён' });
  run('DELETE FROM tournament_bonus_tasks WHERE id = ?', [bt.id]);
  saveToDisk();
  res.json({ ok: true });
});

// ── Tournament lifecycle ───────────────────────────────────────

// POST /api/tournaments/:id/start — start tournament
app.post('/api/tournaments/:id/start', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;

  const { tournament } = owner;

  if (tournament.status !== 'draft') {
    return res.status(400).json({ error: 'Турнир уже запущен или завершён' });
  }

  run('UPDATE tournaments SET status = ? WHERE id = ?', ['active', tournament.id]);
  saveToDisk();

  // Track active tournament for this user
  activeTournaments.set(owner.user.id, tournament.id);

  const updated = queryOne('SELECT * FROM tournaments WHERE id = ?', [tournament.id]);
  broadcastTournaments(owner.user.id);
  console.log(`[api] tournament started: "${updated.name}"`);
  res.json({ tournament: updated });
});

// POST /api/tournaments/:id/complete — complete + standings
app.post('/api/tournaments/:id/complete', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;

  const { tournament } = owner;

  if (tournament.status !== 'active') {
    return res.status(400).json({ error: 'Турнир должен быть активным для завершения' });
  }

  // Sync userState → DB: flush new participants first, then round results
  const userState = userStates.get(owner.user.id);

  // ── Step 0: sync participants from userState into tournament_participants ──
  // During the game, the admin can add players via the overlay.
  // Those players exist only in userState (in-memory), not in the DB.
  // We auto-create them here so their round results can be matched.
  if (userState) {
    const existingParticipants = query(
      'SELECT id, name FROM tournament_participants WHERE tournament_id = ?',
      [tournament.id]
    );
    const existingNames = new Set(existingParticipants.map(p => p.name.toLowerCase().trim()));
    const statePlayers = userState.mode === '2x2' ? (userState.teams || []) : (userState.players || []);
    let participantsFlushed = 0;

    for (const sp of statePlayers) {
      const spName = (sp.name || '').trim();
      if (!spName || existingNames.has(spName.toLowerCase())) continue;

      const pid = randomUUID();
      const pType = userState.mode === '2x2' ? 'team' : 'player';
      const player = pType === 'player' ? findOrCreatePlayer(spName) : null;
      const maxOrder = existingParticipants.length + participantsFlushed;
      run(
        'INSERT INTO tournament_participants (id, tournament_id, player_id, name, type, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [pid, tournament.id, player?.id || null, spName, pType, maxOrder]
      );

      // If team, also flush members
      if (pType === 'team' && Array.isArray(sp.players)) {
        for (let j = 0; j < sp.players.length; j++) {
          const memberName = (sp.players[j].name || sp.players[j] || '').trim();
          const memberPlayer = findOrCreatePlayer(memberName);
          if (memberName) {
            run(
              'INSERT INTO participant_members (participant_id, player_name, sort_order) VALUES (?, ?, ?)',
              [pid, memberName, j]
            );
          }
        }
      }
      participantsFlushed++;
    }

    if (participantsFlushed > 0) {
      saveToDisk();
      console.log(`[api] flushed ${participantsFlushed} new participant(s) from userState for tournament "${tournament.name}"`);
    }
  }

  // ── Step 1: sync userState rounds → round_results ──
  if (userState && Array.isArray(userState.rounds) && userState.rounds.length > 0) {
    // Build name→id mapping for participants (now includes flushed ones)
    const participants = query(
      'SELECT id, name FROM tournament_participants WHERE tournament_id = ?',
      [tournament.id]
    );
    const nameToId = new Map();
    for (const p of participants) {
      nameToId.set(p.name.toLowerCase().trim(), p.id);
      // Also map by id in case round stores participantId
      nameToId.set(p.id, p.id);
    }

    let synced = 0;
    for (const round of userState.rounds) {
      const participantId = nameToId.get(round.participantId)
        || nameToId.get((round.participantName || '').toLowerCase().trim());

      if (!participantId) continue;

      // Check if this round result already exists
      const existing = queryOne(
        'SELECT id FROM round_results WHERE tournament_id = ? AND round_number = ? AND participant_id = ?',
        [tournament.id, round.roundNumber, participantId]
      );
      if (existing) continue;

      const tasksCompleted = Array.isArray(round.tasks)
        ? round.tasks.filter((t) => t.completed).map((t) => t.id)
        : [];

      run(
        'INSERT INTO round_results (id, tournament_id, round_number, participant_id, points_earned, tasks_completed) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), tournament.id, round.roundNumber, participantId, round.points || 0, JSON.stringify(tasksCompleted)]
      );
      synced++;
    }

    if (synced > 0) {
      saveToDisk();
      console.log(`[api] synced ${synced} round(s) from userState for tournament "${tournament.name}"`);
    }
  }

  // Aggregate scores from round_results
  const participantScores = query(
    `SELECT participant_id, SUM(points_earned) as total_points
     FROM round_results
     WHERE tournament_id = ?
     GROUP BY participant_id
     ORDER BY total_points DESC`,
    [tournament.id]
  );

  // Include participants with 0 points
  const allParticipants = query(
    'SELECT id FROM tournament_participants WHERE tournament_id = ?',
    [tournament.id]
  );
  const scoreMap = new Map();
  for (const ps of participantScores) {
    scoreMap.set(ps.participant_id, ps.total_points);
  }
  for (const p of allParticipants) {
    if (!scoreMap.has(p.id)) scoreMap.set(p.id, 0);
  }

  const sorted = [...scoreMap.entries()].sort((a, b) => b[1] - a[1]);

  // Insert standings with competition ranking
  let currentRank = 1;
  const standings = [];
  for (let i = 0; i < sorted.length; i++) {
    const [participantId, totalPoints] = sorted[i];
    if (i > 0 && totalPoints < sorted[i - 1][1]) {
      currentRank = i + 1;
    }
    run(
      'INSERT OR REPLACE INTO tournament_standings (tournament_id, participant_id, total_points, rank) VALUES (?, ?, ?, ?)',
      [tournament.id, participantId, totalPoints, currentRank]
    );
    standings.push({ participant_id: participantId, total_points: totalPoints, rank: currentRank });
  }

  const now = new Date().toISOString();
  run('UPDATE tournaments SET status = ?, completed_at = ? WHERE id = ?', ['completed', now, tournament.id]);
  saveToDisk();

  // Clear active tournament tracking
  activeTournaments.delete(owner.user.id);

  const updated = queryOne('SELECT * FROM tournaments WHERE id = ?', [tournament.id]);
  broadcastTournaments(owner.user.id);
  console.log(`[api] tournament completed: "${updated.name}" (${standings.length} standings)`);
  res.json({ tournament: updated, standings });
});

// ── Active tournament tracking ─────────────────────────────────

// Map: userId → active tournamentId (set on start, cleared on complete)
const activeTournaments = new Map();

// ── Participants API ───────────────────────────────────────────

// GET /api/tournaments/:id/participants
app.get('/api/tournaments/:id/participants', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;

  const participants = query(
    'SELECT * FROM tournament_participants WHERE tournament_id = ? ORDER BY sort_order',
    [owner.tournament.id]
  );
  for (const p of participants) {
    if (p.type === 'team') {
      p.players = query(
        'SELECT player_name as name FROM participant_members WHERE participant_id = ? ORDER BY sort_order',
        [p.id]
      );
    }
  }
  res.json({ participants });
});

// POST /api/tournaments/:id/participants — add participant
app.post('/api/tournaments/:id/participants', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;

  const { name, type, players } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Имя участника обязательно' });
  }

  const participantType = type === 'team' ? 'team' : 'player';
  const maxOrder = queryOne(
    'SELECT MAX(sort_order) as max_order FROM tournament_participants WHERE tournament_id = ?',
    [owner.tournament.id]
  );
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;
  const pid = randomUUID();

  run(
    'INSERT INTO tournament_participants (id, tournament_id, name, type, sort_order) VALUES (?, ?, ?, ?, ?)',
    [pid, owner.tournament.id, name.trim(), participantType, sortOrder]
  );

  if (participantType === 'team' && Array.isArray(players)) {
    for (let j = 0; j < players.length; j++) {
      const pn = typeof players[j] === 'string' ? players[j] : players[j].name;
      if (pn) {
        run(
          'INSERT INTO participant_members (participant_id, player_name, sort_order) VALUES (?, ?, ?)',
          [pid, pn, j]
        );
      }
    }
  }

  saveToDisk();
  broadcastTournaments(owner.user.id);

  const created = queryOne('SELECT * FROM tournament_participants WHERE id = ?', [pid]);
  if (participantType === 'team') {
    created.players = query(
      'SELECT player_name as name FROM participant_members WHERE participant_id = ? ORDER BY sort_order',
      [pid]
    );
  }

  console.log(`[api] participant added: "${name}" to tournament ${owner.tournament.name}`);
  res.status(201).json({ participant: created });
});

// DELETE /api/tournaments/:id/participants/:participantId — remove participant
app.delete('/api/tournaments/:id/participants/:participantId', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;

  const { participantId } = req.params;
  const participant = queryOne(
    'SELECT * FROM tournament_participants WHERE id = ? AND tournament_id = ?',
    [participantId, owner.tournament.id]
  );
  if (!participant) {
    return res.status(404).json({ error: 'Участник не найден' });
  }

  run('DELETE FROM tournament_participants WHERE id = ?', [participantId]);
  saveToDisk();
  broadcastTournaments(owner.user.id);

  console.log(`[api] participant removed: "${participant.name}" from ${owner.tournament.name}`);
  res.json({ ok: true });
});

// ── Tasks API ──────────────────────────────────────────────────

// GET /api/tournaments/:id/tasks
app.get('/api/tournaments/:id/tasks', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;

  const tasks = query(
    'SELECT * FROM tournament_tasks WHERE tournament_id = ? ORDER BY sort_order',
    [owner.tournament.id]
  );
  res.json({ tasks });
});

// POST /api/tournaments/:id/tasks — add task
app.post('/api/tournaments/:id/tasks', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;

  const { text, points } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Текст задания обязателен' });
  }

  const maxOrder = queryOne(
    'SELECT MAX(sort_order) as max_order FROM tournament_tasks WHERE tournament_id = ?',
    [owner.tournament.id]
  );
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;
  const taskId = randomUUID();

  run(
    'INSERT INTO tournament_tasks (id, tournament_id, text, points, sort_order) VALUES (?, ?, ?, ?, ?)',
    [taskId, owner.tournament.id, text.trim(), points || 1, sortOrder]
  );

  saveToDisk();

  const created = queryOne('SELECT * FROM tournament_tasks WHERE id = ?', [taskId]);
  console.log(`[api] task added: "${text}" to ${owner.tournament.name}`);
  res.status(201).json({ task: created });
});

// PUT /api/tournaments/:id/tasks/:taskId — update task
app.put('/api/tournaments/:id/tasks/:taskId', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;

  const { taskId } = req.params;
  const task = queryOne(
    'SELECT * FROM tournament_tasks WHERE id = ? AND tournament_id = ?',
    [taskId, owner.tournament.id]
  );
  if (!task) {
    return res.status(404).json({ error: 'Задание не найдено' });
  }

  const { text, points } = req.body || {};
  if (text !== undefined) {
    if (!text.trim()) return res.status(400).json({ error: 'Текст не может быть пустым' });
    run('UPDATE tournament_tasks SET text = ? WHERE id = ?', [text.trim(), taskId]);
  }
  if (points !== undefined) {
    run('UPDATE tournament_tasks SET points = ? WHERE id = ?', [points, taskId]);
  }

  saveToDisk();

  const updated = queryOne('SELECT * FROM tournament_tasks WHERE id = ?', [taskId]);
  res.json({ task: updated });
});

// DELETE /api/tournaments/:id/tasks/:taskId — remove task
app.delete('/api/tournaments/:id/tasks/:taskId', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;

  const { taskId } = req.params;
  const task = queryOne(
    'SELECT * FROM tournament_tasks WHERE id = ? AND tournament_id = ?',
    [taskId, owner.tournament.id]
  );
  if (!task) {
    return res.status(404).json({ error: 'Задание не найдено' });
  }

  run('DELETE FROM tournament_tasks WHERE id = ?', [taskId]);
  saveToDisk();

  console.log(`[api] task removed: "${task.text}" from ${owner.tournament.name}`);
  res.json({ ok: true });
});

// ── Round Results API ──────────────────────────────────────────

// POST /api/tournaments/:id/rounds — record a round result
app.post('/api/tournaments/:id/rounds', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;

  const { round_number, participant_id, points_earned, tasks_completed } = req.body || {};
  if (!round_number || !participant_id) {
    return res.status(400).json({ error: 'round_number и participant_id обязательны' });
  }

  // Verify participant belongs to this tournament
  const participant = queryOne(
    'SELECT * FROM tournament_participants WHERE id = ? AND tournament_id = ?',
    [participant_id, owner.tournament.id]
  );
  if (!participant) {
    return res.status(400).json({ error: 'Участник не принадлежит этому турниру' });
  }

  const resultId = randomUUID();
  run(
    'INSERT INTO round_results (id, tournament_id, round_number, participant_id, points_earned, tasks_completed) VALUES (?, ?, ?, ?, ?, ?)',
    [resultId, owner.tournament.id, round_number, participant_id, points_earned || 0, JSON.stringify(tasks_completed || [])]
  );

  saveToDisk();

  const created = queryOne('SELECT * FROM round_results WHERE id = ?', [resultId]);
  console.log(`[api] round result recorded: round ${round_number}, ${participant.name}: ${points_earned} pts`);
  res.status(201).json({ result: created });
});

// ── Leaderboard ───────────────────────────────────────────────

// GET /api/leaderboard — global (public)
app.get('/api/leaderboard', (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const mode = req.query.mode; // optional: '1x1' or '2x2'
  const seasonId = req.query.season_id; // optional: filter by season

  const params = [];
  let filters = '';
  if (mode === '1x1' || mode === '2x2') {
    filters += ' AND t.mode = ?';
    params.push(mode);
  }
  if (seasonId) {
    filters += ' AND t.season_id = ?';
    params.push(seasonId);
  }
  params.push(limit);

  const rows = query(
    `SELECT 
       tp.id as participant_id,
       tp.name as participant_name,
       tp.type as participant_type,
       t.id as tournament_id,
       t.name as tournament_name,
       t.mode as tournament_mode,
       ts.total_points,
       ts.rank as tournament_rank,
       u.display_name as organizer_name,
       COALESCE(wl.wins, 0) as wins,
       COALESCE(wl.losses, 0) as losses,
       (1000 + ts.total_points * 5 + COALESCE(wl.wins, 0) * 10 - COALESCE(wl.losses, 0) * 8) as mmr
     FROM tournament_standings ts
     JOIN tournament_participants tp ON ts.participant_id = tp.id
     JOIN tournaments t ON ts.tournament_id = t.id
     JOIN users u ON t.user_id = u.id
     LEFT JOIN (
       SELECT 
         rr.tournament_id,
         rr.participant_id,
         SUM(CASE WHEN rr.points_earned = rm.max_points THEN 1 ELSE 0 END) as wins,
         SUM(CASE WHEN rr.points_earned < rm.max_points THEN 1 ELSE 0 END) as losses
       FROM round_results rr
       JOIN (
         SELECT tournament_id, round_number, MAX(points_earned) as max_points
         FROM round_results
         GROUP BY tournament_id, round_number
       ) rm ON rr.tournament_id = rm.tournament_id AND rr.round_number = rm.round_number
       GROUP BY rr.tournament_id, rr.participant_id
     ) wl ON ts.tournament_id = wl.tournament_id AND ts.participant_id = wl.participant_id
      WHERE t.status = 'completed' ${filters}
     ORDER BY ts.total_points DESC
     LIMIT ?`,
    params
  );

  res.json({ leaderboard: rows });
});

// GET /api/leaderboard/:tournamentId — per-tournament (public)
app.get('/api/leaderboard/:tournamentId', (req, res) => {
  const { tournamentId } = req.params;

  const tournament = queryOne(
    `SELECT t.*, s.name as season_name 
     FROM tournaments t 
     LEFT JOIN seasons s ON t.season_id = s.id 
     WHERE t.id = ?`,
    [tournamentId]
  );
  if (!tournament) {
    return res.status(404).json({ error: 'Турнир не найден' });
  }

  // Pre-compute per-round max points for wins/losses in this tournament
  const wlJoin = `LEFT JOIN (
       SELECT 
         rr.participant_id,
         SUM(CASE WHEN rr.points_earned = rm.max_points THEN 1 ELSE 0 END) as wins,
         SUM(CASE WHEN rr.points_earned < rm.max_points THEN 1 ELSE 0 END) as losses
       FROM round_results rr
       JOIN (
         SELECT round_number, MAX(points_earned) as max_points
         FROM round_results
         WHERE tournament_id = ?
         GROUP BY round_number
       ) rm ON rr.round_number = rm.round_number
       WHERE rr.tournament_id = ?
       GROUP BY rr.participant_id
     ) wl ON %s = wl.participant_id`;

  let standings;
  if (tournament.status === 'completed') {
    standings = query(
      `SELECT ts.*, tp.name as participant_name, tp.type as participant_type,
         COALESCE(wl.wins, 0) as wins,
         COALESCE(wl.losses, 0) as losses,
         (1000 + ts.total_points * 5 + COALESCE(wl.wins, 0) * 10 - COALESCE(wl.losses, 0) * 8) as mmr
       FROM tournament_standings ts
       JOIN tournament_participants tp ON ts.participant_id = tp.id
       ${wlJoin.replace('%s', 'ts.participant_id')}
       WHERE ts.tournament_id = ?
       ORDER BY ts.rank`,
      [tournamentId, tournamentId, tournamentId]
    );
  } else {
    // Live standings from round_results
    standings = query(
      `SELECT 
         tp.id as participant_id,
         tp.name as participant_name,
         tp.type as participant_type,
         COALESCE(SUM(rr.points_earned), 0) as total_points,
         COALESCE(wl.wins, 0) as wins,
         COALESCE(wl.losses, 0) as losses,
         (1000 + COALESCE(SUM(rr.points_earned), 0) * 5 + COALESCE(wl.wins, 0) * 10 - COALESCE(wl.losses, 0) * 8) as mmr
       FROM tournament_participants tp
       LEFT JOIN round_results rr ON tp.id = rr.participant_id
       ${wlJoin.replace('%s', 'tp.id')}
       WHERE tp.tournament_id = ?
       GROUP BY tp.id
       ORDER BY total_points DESC`,
      [tournamentId, tournamentId, tournamentId]
    );
    let rank = 1;
    for (let i = 0; i < standings.length; i++) {
      if (i > 0 && standings[i].total_points < standings[i - 1].total_points) {
        rank = i + 1;
      }
      standings[i].rank = rank;
    }
  }

  res.json({ tournament, standings });
});

// ── Player Stats ──────────────────────────────────────────────

// GET /api/players/:playerId — public player profile
app.get('/api/players/:playerId', (req, res) => {
  const { playerId } = req.params;

  // Determine if playerId looks like a UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId);

  let participant;
  if (isUuid) {
    participant = queryOne('SELECT * FROM tournament_participants WHERE id = ?', [playerId]);
  } else {
    participant = queryOne('SELECT * FROM tournament_participants WHERE name = ?', [playerId]);
  }

  if (!participant) {
    return res.status(404).json({ error: 'Игрок не найден' });
  }

  const nickname = participant.name;

  // Get all completed tournament standings for this player (match by name across tournaments)
  const history = query(
    `SELECT 
       t.id as tournamentId,
       t.name as tournamentName,
       t.mode,
       ts.rank,
       ts.total_points as totalPoints,
       t.completed_at as completedAt
     FROM tournament_standings ts
     JOIN tournaments t ON ts.tournament_id = t.id
     JOIN tournament_participants tp ON ts.participant_id = tp.id
     WHERE tp.name = ? AND t.status = 'completed'
     ORDER BY t.completed_at DESC`,
    [nickname]
  );

  // Compute total wins/losses across all tournaments for this player
  const wl = queryOne(
    `SELECT 
       COALESCE(SUM(CASE WHEN rr.points_earned = rm.max_points THEN 1 ELSE 0 END), 0) as totalWins,
       COALESCE(SUM(CASE WHEN rr.points_earned < rm.max_points THEN 1 ELSE 0 END), 0) as totalLosses
     FROM round_results rr
     JOIN (
       SELECT tournament_id, round_number, MAX(points_earned) as max_points
       FROM round_results
       GROUP BY tournament_id, round_number
     ) rm ON rr.tournament_id = rm.tournament_id AND rr.round_number = rm.round_number
     JOIN tournament_participants tp ON rr.participant_id = tp.id
     WHERE tp.name = ?`,
    [nickname]
  );

  const totalWins = wl?.totalWins || 0;
  const totalLosses = wl?.totalLosses || 0;
  const totalTournaments = history.length;

  // Compute per-tournament MMR for peak/current
  let peakMmr = 1000;
  let currentMmr = 1000;
  if (history.length > 0) {
    // Most recent tournament (first in DESC order) for currentMmr
    const latest = history[0];
    currentMmr = 1000 + latest.totalPoints * 5 + totalWins * 10 - totalLosses * 8;
    peakMmr = currentMmr;
    for (const h of history) {
      const mmr = 1000 + h.totalPoints * 5 + totalWins * 10 - totalLosses * 8;
      if (mmr > peakMmr) peakMmr = mmr;
    }
  }

  res.json({
    playerId: participant.id,
    nickname,
    totalTournaments,
    totalWins,
    totalLosses,
    peakMmr,
    currentMmr,
    history,
  });
});

// ── Profile ────────────────────────────────────────────────────

// GET /api/profile — current user profile
app.get('/api/profile', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const tournamentCount = queryOne(
    'SELECT COUNT(*) as count FROM tournaments WHERE user_id = ?',
    [user.id]
  );
  const completedCount = queryOne(
    "SELECT COUNT(*) as count FROM tournaments WHERE user_id = ? AND status = 'completed'",
    [user.id]
  );
  const activeCount = queryOne(
    "SELECT COUNT(*) as count FROM tournaments WHERE user_id = ? AND status = 'active'",
    [user.id]
  );

  res.json({
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      created_at: user.created_at,
    },
    stats: {
      tournaments_total: tournamentCount?.count || 0,
      tournaments_completed: completedCount?.count || 0,
      tournaments_active: activeCount?.count || 0,
    },
  });
});

// ── Seasons API ────────────────────────────────────────────────

// GET /api/seasons — list all seasons (public)
app.get('/api/seasons', (req, res) => {
  const seasons = query('SELECT * FROM seasons ORDER BY created_at DESC');
  res.json({ seasons });
});

// POST /api/seasons — create a season (auth)
app.post('/api/seasons', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const { id, name, description, started_at } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Название сезона обязательно' });
  }
  if (!id || !id.trim()) {
    return res.status(400).json({ error: 'ID сезона обязателен (например: season-3)' });
  }

  const existing = queryOne('SELECT id FROM seasons WHERE id = ?', [id.trim()]);
  if (existing) {
    return res.status(409).json({ error: 'Сезон с таким ID уже существует' });
  }

  run(
    'INSERT INTO seasons (id, name, description, status, started_at) VALUES (?, ?, ?, ?, ?)',
    [id.trim(), name.trim(), description || null, 'active', started_at || null]
  );
  saveToDisk();

  const season = queryOne('SELECT * FROM seasons WHERE id = ?', [id.trim()]);
  res.status(201).json({ season });
});

// GET /api/seasons/:id — season detail (public)
app.get('/api/seasons/:id', (req, res) => {
  const season = queryOne('SELECT * FROM seasons WHERE id = ?', [req.params.id]);
  if (!season) {
    return res.status(404).json({ error: 'Сезон не найден' });
  }

  // Include counts
  const tournamentCount = queryOne(
    'SELECT COUNT(*) as count FROM tournaments WHERE season_id = ?',
    [season.id]
  );
  const completedCount = queryOne(
    "SELECT COUNT(*) as count FROM tournaments WHERE season_id = ? AND status = 'completed'",
    [season.id]
  );

  res.json({
    season,
    stats: {
      tournaments_total: tournamentCount?.count || 0,
      tournaments_completed: completedCount?.count || 0,
    },
  });
});

// PUT /api/seasons/:id — update season (auth)
app.put('/api/seasons/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const season = queryOne('SELECT * FROM seasons WHERE id = ?', [req.params.id]);
  if (!season) {
    return res.status(404).json({ error: 'Сезон не найден' });
  }

  const { name, description, status, started_at, ended_at } = req.body || {};
  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (started_at !== undefined) { updates.push('started_at = ?'); params.push(started_at); }
  if (ended_at !== undefined) { updates.push('ended_at = ?'); params.push(ended_at); }

  if (updates.length > 0) {
    params.push(season.id);
    run(`UPDATE seasons SET ${updates.join(', ')} WHERE id = ?`, params);
    saveToDisk();
  }

  const updated = queryOne('SELECT * FROM seasons WHERE id = ?', [season.id]);
  res.json({ season: updated });
});

// ── Contracts Pool API ────────────────────────────────────────

// GET /api/seasons/:id/contracts — list all contracts (with optional filters)
app.get('/api/seasons/:id/contracts', (req, res) => {
  const { category, legendary } = req.query;
  let sql = 'SELECT * FROM contracts WHERE season_id = ?';
  const params = [req.params.id];

  if (category && ['pve','pvp','pvpve','boosty'].includes(category)) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (legendary === '1') {
    sql += ' AND is_legendary = 1';
  } else if (legendary === '0') {
    sql += ' AND is_legendary = 0';
  }

  sql += ' ORDER BY sort_order';
  const contracts = query(sql, params);
  res.json({ contracts });
});

// POST /api/seasons/:id/contracts — add contract (auth)
app.post('/api/seasons/:id/contracts', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const season = queryOne('SELECT * FROM seasons WHERE id = ?', [req.params.id]);
  if (!season) {
    return res.status(404).json({ error: 'Сезон не найден' });
  }

  const { category, text, points, is_legendary, boosty_author } = req.body || {};
  if (!category || !text || !text.trim()) {
    return res.status(400).json({ error: 'Категория и текст контракта обязательны' });
  }
  if (!['pve','pvp','pvpve','boosty'].includes(category)) {
    return res.status(400).json({ error: 'Недопустимая категория' });
  }

  const maxOrder = queryOne(
    'SELECT MAX(sort_order) as max_order FROM contracts WHERE season_id = ?',
    [season.id]
  );
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;
  const cid = randomUUID();

  run(
    `INSERT INTO contracts (id, season_id, category, text, points, is_legendary, boosty_author, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [cid, season.id, category, text.trim(), points || 2, is_legendary ? 1 : 0, boosty_author || null, sortOrder]
  );
  saveToDisk();

  const contract = queryOne('SELECT * FROM contracts WHERE id = ?', [cid]);
  res.status(201).json({ contract });
});

// PUT /api/seasons/:id/contracts/:cid — update contract (auth)
app.put('/api/seasons/:id/contracts/:cid', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const contract = queryOne(
    'SELECT * FROM contracts WHERE id = ? AND season_id = ?',
    [req.params.cid, req.params.id]
  );
  if (!contract) {
    return res.status(404).json({ error: 'Контракт не найден' });
  }

  const { category, text, points, is_legendary, boosty_author, completed_by, completed_at } = req.body || {};
  const updates = [];
  const params = [];

  if (category !== undefined) { updates.push('category = ?'); params.push(category); }
  if (text !== undefined) { updates.push('text = ?'); params.push(text); }
  if (points !== undefined) { updates.push('points = ?'); params.push(points); }
  if (is_legendary !== undefined) { updates.push('is_legendary = ?'); params.push(is_legendary ? 1 : 0); }
  if (boosty_author !== undefined) { updates.push('boosty_author = ?'); params.push(boosty_author || null); }
  if (completed_by !== undefined) { updates.push('completed_by = ?'); params.push(completed_by || null); }
  if (completed_at !== undefined) { updates.push('completed_at = ?'); params.push(completed_at || null); }

  if (updates.length > 0) {
    params.push(contract.id);
    run(`UPDATE contracts SET ${updates.join(', ')} WHERE id = ?`, params);
    saveToDisk();
  }

  const updated = queryOne('SELECT * FROM contracts WHERE id = ?', [contract.id]);
  res.json({ contract: updated });
});

// DELETE /api/seasons/:id/contracts/:cid — delete contract (auth)
app.delete('/api/seasons/:id/contracts/:cid', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const contract = queryOne(
    'SELECT * FROM contracts WHERE id = ? AND season_id = ?',
    [req.params.cid, req.params.id]
  );
  if (!contract) {
    return res.status(404).json({ error: 'Контракт не найден' });
  }

  run('DELETE FROM contracts WHERE id = ?', [contract.id]);
  saveToDisk();
  res.json({ ok: true });
});

// ── Protocols Pool API ────────────────────────────────────────

// GET /api/seasons/:id/protocols — list all protocols
app.get('/api/seasons/:id/protocols', (req, res) => {
  const protocols = query(
    'SELECT * FROM protocols WHERE season_id = ? ORDER BY sort_order',
    [req.params.id]
  );
  res.json({ protocols });
});

// POST /api/seasons/:id/protocols — add protocol (auth)
app.post('/api/seasons/:id/protocols', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const season = queryOne('SELECT * FROM seasons WHERE id = ?', [req.params.id]);
  if (!season) {
    return res.status(404).json({ error: 'Сезон не найден' });
  }

  const { text, penalty_seconds, boosty_author } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Текст протокола обязателен' });
  }

  const maxOrder = queryOne(
    'SELECT MAX(sort_order) as max_order FROM protocols WHERE season_id = ?',
    [season.id]
  );
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;
  const pid = randomUUID();

  run(
    'INSERT INTO protocols (id, season_id, text, penalty_seconds, boosty_author, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [pid, season.id, text.trim(), penalty_seconds || 60, boosty_author || null, sortOrder]
  );
  saveToDisk();

  const protocol = queryOne('SELECT * FROM protocols WHERE id = ?', [pid]);
  res.status(201).json({ protocol });
});

// PUT /api/seasons/:id/protocols/:pid — update protocol (auth)
app.put('/api/seasons/:id/protocols/:pid', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const protocol = queryOne(
    'SELECT * FROM protocols WHERE id = ? AND season_id = ?',
    [req.params.pid, req.params.id]
  );
  if (!protocol) {
    return res.status(404).json({ error: 'Протокол не найден' });
  }

  const { text, penalty_seconds, boosty_author } = req.body || {};
  const updates = [];
  const params = [];

  if (text !== undefined) { updates.push('text = ?'); params.push(text); }
  if (penalty_seconds !== undefined) { updates.push('penalty_seconds = ?'); params.push(penalty_seconds); }
  if (boosty_author !== undefined) { updates.push('boosty_author = ?'); params.push(boosty_author || null); }

  if (updates.length > 0) {
    params.push(protocol.id);
    run(`UPDATE protocols SET ${updates.join(', ')} WHERE id = ?`, params);
    saveToDisk();
  }

  const updated = queryOne('SELECT * FROM protocols WHERE id = ?', [protocol.id]);
  res.json({ protocol: updated });
});

// DELETE /api/seasons/:id/protocols/:pid — delete protocol (auth)
app.delete('/api/seasons/:id/protocols/:pid', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const protocol = queryOne(
    'SELECT * FROM protocols WHERE id = ? AND season_id = ?',
    [req.params.pid, req.params.id]
  );
  if (!protocol) {
    return res.status(404).json({ error: 'Протокол не найден' });
  }

  run('DELETE FROM protocols WHERE id = ?', [protocol.id]);
  saveToDisk();
  res.json({ ok: true });
});

// ── Legendary Contracts API ───────────────────────────────────

// GET /api/seasons/:id/legendary — list legendary contracts with completion status
app.get('/api/seasons/:id/legendary', (req, res) => {
  const contracts = query(
    "SELECT * FROM contracts WHERE season_id = ? AND is_legendary = 1 ORDER BY category, sort_order",
    [req.params.id]
  );
  res.json({ legendary: contracts });
});

// POST /api/rounds/:rid/legendary/:cid — mark legendary contract as completed
app.post('/api/rounds/:rid/legendary/:cid', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const roundResult = queryOne('SELECT * FROM round_results WHERE id = ?', [req.params.rid]);
  if (!roundResult) {
    return res.status(404).json({ error: 'Результат раунда не найден' });
  }

  // Verify tournament ownership via round_result → tournament
  const tournament = queryOne('SELECT * FROM tournaments WHERE id = ?', [roundResult.tournament_id]);
  if (!tournament || tournament.user_id !== user.id) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  const contract = queryOne(
    "SELECT * FROM contracts WHERE id = ? AND is_legendary = 1",
    [req.params.cid]
  );
  if (!contract) {
    return res.status(404).json({ error: 'Легендарный контракт не найден' });
  }

  if (contract.completed_by) {
    return res.status(409).json({ error: 'Этот легендарный контракт уже выполнен' });
  }

  const { player_name } = req.body || {};
  const now = new Date().toISOString();

  run(
    'UPDATE contracts SET completed_by = ?, completed_at = ? WHERE id = ?',
    [player_name || 'Unknown', now, contract.id]
  );

  // Add 10 points to the round's participant
  run(
    'UPDATE round_results SET points_earned = points_earned + 10 WHERE id = ?',
    [roundResult.id]
  );

  saveToDisk();

  const updated = queryOne('SELECT * FROM contracts WHERE id = ?', [contract.id]);
  const updatedRound = queryOne('SELECT * FROM round_results WHERE id = ?', [roundResult.id]);
  console.log(`[api] legendary contract completed: "${updated.text}" by ${updated.completed_by}`);
  res.json({ contract: updated, round: updatedRound });
});

// ── Round Contract/Protocol Assignment ────────────────────────

// POST /api/tournaments/:id/rounds/:rid/contracts — assign random contracts
app.post('/api/tournaments/:id/rounds/:rid/contracts', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;

  const roundResult = queryOne(
    'SELECT * FROM round_results WHERE id = ? AND tournament_id = ?',
    [req.params.rid, owner.tournament.id]
  );
  if (!roundResult) {
    return res.status(404).json({ error: 'Результат раунда не найден' });
  }

  const participant = queryOne(
    'SELECT * FROM tournament_participants WHERE id = ?',
    [roundResult.participant_id]
  );

  const seasonId = owner.tournament.season_id;
  if (!seasonId) {
    return res.status(400).json({ error: 'Турнир не привязан к сезону' });
  }

  // Determine which contract categories apply based on participant type
  const playerType = (participant?.player_type || 'pvpve').toLowerCase();
  let categories = ["'pve'", "'pvpve'"];
  if (playerType === 'pvp') categories = ["'pvp'", "'pvpve'"];
  else if (playerType === 'pve') categories = ["'pve'"];

  // Get 2 random non-legendary contracts from the season pool
  const pool = query(
    `SELECT * FROM contracts 
     WHERE season_id = ? AND is_legendary = 0 AND category IN (${categories.join(',')})
     ORDER BY RANDOM() LIMIT 2`,
    [seasonId]
  );

  if (pool.length === 0) {
    return res.status(400).json({ error: 'Нет доступных контрактов в пуле сезона' });
  }

  // Remove any existing contract assignments for this round
  run('DELETE FROM round_contracts WHERE round_result_id = ?', [roundResult.id]);

  const assigned = [];
  for (const c of pool) {
    const rcid = randomUUID();
    run(
      `INSERT INTO round_contracts (id, round_result_id, contract_id, participant_id)
       VALUES (?, ?, ?, ?)`,
      [rcid, roundResult.id, c.id, roundResult.participant_id]
    );
    assigned.push({ ...c, assignment_id: rcid });
  }

  saveToDisk();
  res.json({ assigned: pool, count: pool.length });
});

// POST /api/tournaments/:id/rounds/:rid/protocols — assign random protocol
app.post('/api/tournaments/:id/rounds/:rid/protocols', (req, res) => {
  const owner = requireOwnership(req, res, req.params.id);
  if (!owner) return;

  const roundResult = queryOne(
    'SELECT * FROM round_results WHERE id = ? AND tournament_id = ?',
    [req.params.rid, owner.tournament.id]
  );
  if (!roundResult) {
    return res.status(404).json({ error: 'Результат раунда не найден' });
  }

  const seasonId = owner.tournament.season_id;
  if (!seasonId) {
    return res.status(400).json({ error: 'Турнир не привязан к сезону' });
  }

  // Get 1 random protocol — avoid repeats within the same tournament/round
  const usedProtocolIds = query(
    `SELECT rp.protocol_id FROM round_protocols rp
     JOIN round_results rr ON rp.round_result_id = rr.id
     WHERE rr.tournament_id = ?`,
    [owner.tournament.id]
  ).map(r => r.protocol_id);

  let poolQuery = 'SELECT * FROM protocols WHERE season_id = ?';
  const poolParams = [seasonId];
  if (usedProtocolIds.length > 0) {
    poolQuery += ` AND id NOT IN (${usedProtocolIds.map(() => '?').join(',')})`;
    poolParams.push(...usedProtocolIds);
  }
  poolQuery += ' ORDER BY RANDOM() LIMIT 1';

  const pool = query(poolQuery, poolParams);

  if (pool.length === 0) {
    return res.status(400).json({ error: 'Нет доступных протоколов (все уже использованы в этом турнире)' });
  }

  // Remove any existing protocol assignment for this round/participant
  run(
    'DELETE FROM round_protocols WHERE round_result_id = ? AND participant_id = ?',
    [roundResult.id, roundResult.participant_id]
  );

  const rpid = randomUUID();
  run(
    `INSERT INTO round_protocols (id, round_result_id, protocol_id, participant_id)
     VALUES (?, ?, ?, ?)`,
    [rpid, roundResult.id, pool[0].id, roundResult.participant_id]
  );

  saveToDisk();
  res.json({ protocol: pool[0], assignment_id: rpid });
});

// ── Round Contracts/Protocols Status ──────────────────────────

// PUT /api/round-contracts/:id — update contract completion status
app.put('/api/round-contracts/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const rc = queryOne('SELECT * FROM round_contracts WHERE id = ?', [req.params.id]);
  if (!rc) {
    return res.status(404).json({ error: 'Назначение контракта не найдено' });
  }

  // Verify ownership via round_result → tournament
  const rr = queryOne('SELECT * FROM round_results WHERE id = ?', [rc.round_result_id]);
  const tournament = queryOne('SELECT * FROM tournaments WHERE id = ?', [rr.tournament_id]);
  if (!tournament || tournament.user_id !== user.id) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  const { completed, completed_by_opponent } = req.body || {};

  const updates = [];
  const params = [];
  if (completed !== undefined) { updates.push('completed = ?'); params.push(completed ? 1 : 0); }
  if (completed_by_opponent !== undefined) { updates.push('completed_by_opponent = ?'); params.push(completed_by_opponent ? 1 : 0); }

  // Calculate points: 2 for own, 1 for opponent's
  const ownPoints = completed ? 2 : 0;
  const oppPoints = completed_by_opponent ? 1 : 0;
  updates.push('points_earned = ?');
  params.push(ownPoints + oppPoints);

  if (updates.length > 0) {
    params.push(rc.id);
    run(`UPDATE round_contracts SET ${updates.join(', ')} WHERE id = ?`, params);
    saveToDisk();
  }

  const updated = queryOne('SELECT * FROM round_contracts WHERE id = ?', [rc.id]);
  res.json({ assignment: updated });
});

// PUT /api/round-protocols/:id — update protocol violation status
app.put('/api/round-protocols/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const rp = queryOne('SELECT * FROM round_protocols WHERE id = ?', [req.params.id]);
  if (!rp) {
    return res.status(404).json({ error: 'Назначение протокола не найдено' });
  }

  const rr = queryOne('SELECT * FROM round_results WHERE id = ?', [rp.round_result_id]);
  const tournament = queryOne('SELECT * FROM tournaments WHERE id = ?', [rr.tournament_id]);
  if (!tournament || tournament.user_id !== user.id) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  const { violated } = req.body || {};
  run('UPDATE round_protocols SET violated = ? WHERE id = ?', [violated ? 1 : 0, rp.id]);
  saveToDisk();

  const updated = queryOne('SELECT * FROM round_protocols WHERE id = ?', [rp.id]);
  res.json({ assignment: updated });
});

// GET /api/tournaments/:id/rounds/:rid/assignments — all contracts and protocols for a round
app.get('/api/tournaments/:id/rounds/:rid/assignments', (req, res) => {
  const roundResult = queryOne(
    'SELECT * FROM round_results WHERE id = ? AND tournament_id = ?',
    [req.params.rid, req.params.id]
  );
  if (!roundResult) {
    return res.status(404).json({ error: 'Результат раунда не найден' });
  }

  const contracts = query(
    `SELECT rc.*, c.text as contract_text, c.category, c.points as contract_points
     FROM round_contracts rc
     JOIN contracts c ON rc.contract_id = c.id
     WHERE rc.round_result_id = ?
     ORDER BY c.sort_order`,
    [roundResult.id]
  );

  const protocols = query(
    `SELECT rp.*, p.text as protocol_text, p.penalty_seconds
     FROM round_protocols rp
     JOIN protocols p ON rp.protocol_id = p.id
     WHERE rp.round_result_id = ?
     ORDER BY p.sort_order`,
    [roundResult.id]
  );

  res.json({ contracts, protocols });
});

// ── Public Season Pages ───────────────────────────────────────

// GET /api/seasons/:id/matches — match history for a season
app.get('/api/seasons/:id/matches', (req, res) => {
  const { mode } = req.query;

  let sql = `
    SELECT t.id, t.name, t.mode, t.completed_at, t.total_rounds,
           u.display_name as organizer_name
    FROM tournaments t
    JOIN users u ON t.user_id = u.id
    WHERE t.season_id = ? AND t.status = 'completed'`;
  const params = [req.params.id];

  if (mode === '1x1' || mode === '2x2') {
    sql += ' AND t.mode = ?';
    params.push(mode);
  }
  sql += ' ORDER BY t.completed_at DESC';

  const matches = query(sql, params);

  if (matches.length > 0) {
    // Batch: winners + participant counts in 2 queries instead of 2N
    const matchIds = matches.map(m => m.id);
    const placeholders = matchIds.map(() => '?').join(',');

    // All winners at once
    const winners = query(
      `SELECT ts.tournament_id, tp.name, ts.total_points
       FROM tournament_standings ts
       JOIN tournament_participants tp ON ts.participant_id = tp.id
       WHERE ts.tournament_id IN (${placeholders}) AND ts.rank = 1`,
      matchIds
    );
    const winnerMap = new Map(winners.map(w => [w.tournament_id, w]));

    // All participant counts at once
    const counts = query(
      `SELECT tournament_id, COUNT(*) as count
       FROM tournament_participants
       WHERE tournament_id IN (${placeholders})
       GROUP BY tournament_id`,
      matchIds
    );
    const countMap = new Map(counts.map(c => [c.tournament_id, c.count]));

    for (const m of matches) {
      m.winner = winnerMap.get(m.id) || null;
      m.participants_count = countMap.get(m.id) || 0;
    }
  }

  res.json({ matches });
});

// GET /api/seasons/:id/teams — 2x2 team rosters for a season
app.get('/api/seasons/:id/teams', (req, res) => {
  const teams = query(
    `SELECT tp.id, tp.name, t.name as tournament_name, t.id as tournament_id
     FROM tournament_participants tp
     JOIN tournaments t ON tp.tournament_id = t.id
     WHERE t.season_id = ? AND tp.type = 'team'
     ORDER BY t.completed_at DESC, tp.sort_order`,
    [req.params.id]
  );

  // Batch enrich: members + standings in 2 queries instead of 2N
  if (teams.length > 0) {
    const teamIds = teams.map(t => t.id);
    const placeholders = teamIds.map(() => '?').join(',');

    // All members at once
    const allMembers = query(
      `SELECT participant_id, player_name as name
       FROM participant_members
       WHERE participant_id IN (${placeholders})
       ORDER BY participant_id, sort_order`,
      teamIds
    );
    const membersMap = new Map();
    for (const m of allMembers) {
      if (!membersMap.has(m.participant_id)) membersMap.set(m.participant_id, []);
      membersMap.get(m.participant_id).push({ name: m.name });
    }

    // All standings at once
    const allStandings = query(
      `SELECT tournament_id, participant_id, total_points, rank
       FROM tournament_standings
       WHERE participant_id IN (${placeholders})`,
      teamIds
    );
    const standingsMap = new Map();
    for (const s of allStandings) {
      standingsMap.set(s.participant_id, s);
    }

    for (const team of teams) {
      team.members = membersMap.get(team.id) || [];
      const s = standingsMap.get(team.id);
      team.total_points = s?.total_points || 0;
      team.rank = s?.rank || null;
    }
  }

  res.json({ teams });
});

// GET /api/seasons/:id/ratings/1x1 — 1x1 ratings for a season
app.get('/api/seasons/:id/ratings/1x1', (req, res) => {
  const imported = getImportedRatings(req.params.id, '1x1');
  if (imported.length > 0) {
    return res.json({ ratings: imported, mode: '1x1', source: 'imported' });
  }
  const ratings = computeSeasonRatings(req.params.id, '1x1');
  res.json({ ratings, mode: '1x1', source: 'computed' });
});

// GET /api/seasons/:id/ratings/2x2 — 2x2 ratings for a season
app.get('/api/seasons/:id/ratings/2x2', (req, res) => {
  const imported = getImportedRatings(req.params.id, '2x2');
  if (imported.length > 0) {
    return res.json({ ratings: imported, mode: '2x2', source: 'imported' });
  }
  const ratings = computeSeasonRatings(req.params.id, '2x2');
  res.json({ ratings, mode: '2x2', source: 'computed' });
});

function computeSeasonRatings(seasonId, mode) {
  // Aggregate all completed tournament standings for the season and mode
  const rows = query(
    `SELECT 
       tp.id as participant_id,
       tp.name as participant_name,
       tp.type as participant_type,
       COUNT(ts.tournament_id) as tournaments_played,
       SUM(CASE WHEN ts.rank = 1 THEN 1 ELSE 0 END) as wins,
       SUM(CASE WHEN ts.rank > 1 THEN 1 ELSE 0 END) as losses,
       SUM(ts.total_points) as total_points,
       MAX(ts.total_points) as best_score
     FROM tournament_standings ts
     JOIN tournament_participants tp ON ts.participant_id = tp.id
     JOIN tournaments t ON ts.tournament_id = t.id
     WHERE t.season_id = ? AND t.mode = ? AND t.status = 'completed'
     GROUP BY tp.id, tp.name
     ORDER BY total_points DESC`,
    [seasonId, mode]
  );

  // Compute MMR: base 1000 + points × 3 + wins × 15 − losses × 5
  return rows.map((r, i) => ({
    rank: i + 1,
    participant_name: r.participant_name,
    participant_type: r.participant_type,
    tournaments_played: r.tournaments_played,
    wins: r.wins,
    losses: r.losses,
    total_points: r.total_points,
    best_score: r.best_score,
    mmr: 1000 + r.total_points * 3 + r.wins * 15 - r.losses * 5,
  }));
}

/** Read ratings imported from Google Sheets (season_player_ratings table) */
function getImportedRatings(seasonId, mode) {
  const rows = query(
    `SELECT rank, nickname as participant_name, 'player' as participant_type,
            wins, losses, streak,
            wins + losses as tournaments_played,
            0 as total_points,
            wins as best_score,
            mmr
     FROM season_player_ratings
     WHERE season_id = ? AND mode = ?
     ORDER BY rank`,
    [seasonId, mode]
  );
  return rows;
}

// ── Admin API ──────────────────────────────────────────────────

// GET /api/admin/stats — aggregated counts for admin dashboard
app.get('/api/admin/stats', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const activeSeasons = query("SELECT COUNT(*) as count FROM seasons WHERE status = 'active'");
  const totalSeasons = queryOne('SELECT COUNT(*) as count FROM seasons');
  const totalTournaments = queryOne('SELECT COUNT(*) as count FROM tournaments');
  const activeTournaments = queryOne("SELECT COUNT(*) as count FROM tournaments WHERE status = 'active'");
  const completedTournaments = queryOne("SELECT COUNT(*) as count FROM tournaments WHERE status = 'completed'");
  const totalPlayers = queryOne('SELECT COUNT(DISTINCT name) as count FROM tournament_participants');
  const totalParticipants = queryOne('SELECT COUNT(*) as count FROM tournament_participants');
  const totalRounds = queryOne('SELECT COUNT(*) as count FROM round_results');

  // Last completed tournament
  const lastTournament = queryOne(
    `SELECT t.id, t.name, t.mode, t.completed_at, u.display_name as organizer_name
     FROM tournaments t JOIN users u ON t.user_id = u.id
     WHERE t.status = 'completed' ORDER BY t.completed_at DESC LIMIT 1`
  );

  // User's tournaments count
  const myTournaments = queryOne(
    'SELECT COUNT(*) as count FROM tournaments WHERE user_id = ?',
    [user.id]
  );

  res.json({
    seasons: { total: totalSeasons.count, active: activeSeasons[0].count },
    tournaments: {
      total: totalTournaments.count,
      active: activeTournaments.count,
      completed: completedTournaments.count,
      my: myTournaments.count,
    },
    players: {
      total: totalPlayers.count,
      participants: totalParticipants.count,
    },
    rounds: totalRounds.count,
    lastTournament,
  });
});

// GET /api/players — list all players (from tournament_participants + players table)
app.get('/api/players', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const { search, limit, offset } = req.query;

  // Show all unique participant names, enriched with players-table metadata
  let sql = `
    SELECT
      p.id,
      tp.name as display_name,
      p.embark_id,
      p.discord_name,
      p.created_at,
      COUNT(tp2.id) as tournament_count
    FROM (SELECT DISTINCT name FROM tournament_participants) tp
    LEFT JOIN players p ON p.display_name = tp.name
    LEFT JOIN tournament_participants tp2 ON tp2.name = tp.name
    GROUP BY tp.name
  `;
  let countSql = 'SELECT COUNT(DISTINCT name) as count FROM tournament_participants';
  const params = [];
  const countParams = [];

  if (search) {
    sql += ' HAVING tp.name LIKE ?';
    params.push(`%${search}%`);
    countSql = 'SELECT COUNT(DISTINCT name) as count FROM tournament_participants WHERE name LIKE ?';
    countParams.push(`%${search}%`);
  }

  sql += ' ORDER BY tp.name ASC';

  if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
  if (offset) { sql += ' OFFSET ?'; params.push(parseInt(offset)); }

  const players = query(sql, params);
  const total = queryOne(countSql, countParams);

  res.json({ players, total: total?.count || 0 });
});

// PUT /api/players/:id — upsert player fields (auto-creates if new)
app.put('/api/players/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const { display_name, embark_id, discord_name } = req.body || {};
  const playerName = (display_name || req.params.id).trim();

  // Find existing player by id or display_name
  let player = queryOne('SELECT * FROM players WHERE id = ? OR display_name = ?', [req.params.id, playerName]);

  if (!player) {
    // Auto-create — INSERT into players
    const newId = randomUUID();
    run(
      'INSERT INTO players (id, display_name, embark_id, discord_name) VALUES (?, ?, ?, ?)',
      [newId, playerName, embark_id || null, discord_name || null]
    );
    saveToDisk();
    player = queryOne('SELECT * FROM players WHERE id = ?', [newId]);
    return res.json({ player });
  }

  // Update existing
  const updates = [];
  const params = [];

  if (display_name !== undefined && display_name !== player.display_name) {
    updates.push('display_name = ?'); params.push(playerName);
  }
  if (embark_id !== undefined) { updates.push('embark_id = ?'); params.push(embark_id || null); }
  if (discord_name !== undefined) { updates.push('discord_name = ?'); params.push(discord_name || null); }

  if (updates.length > 0) {
    params.push(player.id);
    run(`UPDATE players SET ${updates.join(', ')} WHERE id = ?`, params);
    saveToDisk();
    player = queryOne('SELECT * FROM players WHERE id = ?', [player.id]);
  }

  res.json({ player });
});

// PUT /api/rounds/:id — edit round result (post-mortem correction)
app.put('/api/rounds/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const round = queryOne('SELECT r.*, t.user_id FROM round_results r JOIN tournaments t ON r.tournament_id = t.id WHERE r.id = ?', [req.params.id]);
  if (!round) {
    return res.status(404).json({ error: 'Результат раунда не найден' });
  }
  if (round.user_id !== user.id) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  const { points_earned, map_name, map_condition, deaths, loot_allowed, crafted_keys_used, penalty_seconds_applied } = req.body || {};
  const updates = [];
  const params = [];

  if (points_earned !== undefined) { updates.push('points_earned = ?'); params.push(points_earned); }
  if (map_name !== undefined) { updates.push('map_name = ?'); params.push(map_name); }
  if (map_condition !== undefined) { updates.push('map_condition = ?'); params.push(map_condition); }
  if (deaths !== undefined) { updates.push('deaths = ?'); params.push(deaths); }
  if (loot_allowed !== undefined) { updates.push('loot_allowed = ?'); params.push(loot_allowed ? 1 : 0); }
  if (crafted_keys_used !== undefined) { updates.push('crafted_keys_used = ?'); params.push(crafted_keys_used); }
  if (penalty_seconds_applied !== undefined) { updates.push('penalty_seconds_applied = ?'); params.push(penalty_seconds_applied); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Нет полей для обновления' });
  }

  params.push(round.id);
  run(`UPDATE round_results SET ${updates.join(', ')} WHERE id = ?`, params);
  saveToDisk();

  const updated = queryOne('SELECT * FROM round_results WHERE id = ?', [round.id]);
  res.json({ round: updated });
});

// PUT /api/tournament-participants/:id — update participant fields (embark_id, amplifier, etc.)
app.put('/api/tournament-participants/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const p = queryOne(
    'SELECT tp.*, t.user_id FROM tournament_participants tp JOIN tournaments t ON tp.tournament_id = t.id WHERE tp.id = ?',
    [req.params.id]
  );
  if (!p) {
    return res.status(404).json({ error: 'Участник не найден' });
  }
  if (p.user_id !== user.id) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  const { name, embark_id, hours_played, lobby_type, player_type, amplifier, shield, discord_role } = req.body || {};
  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
  if (embark_id !== undefined) { updates.push('embark_id = ?'); params.push(embark_id || null); }
  if (hours_played !== undefined) { updates.push('hours_played = ?'); params.push(hours_played); }
  if (lobby_type !== undefined) { updates.push('lobby_type = ?'); params.push(lobby_type); }
  if (player_type !== undefined) { updates.push('player_type = ?'); params.push(player_type); }
  if (amplifier !== undefined) { updates.push('amplifier = ?'); params.push(amplifier); }
  if (shield !== undefined) { updates.push('shield = ?'); params.push(shield); }
  if (discord_role !== undefined) { updates.push('discord_role = ?'); params.push(discord_role); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Нет полей для обновления' });
  }

  params.push(p.id);
  run(`UPDATE tournament_participants SET ${updates.join(', ')} WHERE id = ?`, params);
  saveToDisk();

  const updated = queryOne('SELECT * FROM tournament_participants WHERE id = ?', [p.id]);
  res.json({ participant: updated });
});

// ── Serve static files from dist/ ────────────────────────────

app.use(express.static(DIST_DIR, {
  maxAge: '1h',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, must-revalidate');
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
        ws.userId = session.user_id;
        ws.send(JSON.stringify({ type: 'auth', ok: true, userId: session.user_id }));
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
      case 'spinRoulette': {
        if (msg.targetAngle != null && ws.authenticated) {
          broadcast({ type: 'spinRoulette', targetAngle: msg.targetAngle, resultIndex: msg.resultIndex, items: msg.items, spinId: msg.spinId, spinning: true }, effectiveUserId);
        }
        break;
      }
      case 'setRouletteItems': {
        if (ws.authenticated) {
          const st = userStates.get(effectiveUserId);
          st.rouletteItems = Array.isArray(msg.items) ? msg.items : [];
          broadcast({ type: 'setRouletteItems', items: st.rouletteItems }, effectiveUserId);
        }
        break;
      }
      case 'clearRoulette': {
        if (ws.authenticated) {
          broadcast({ type: 'clearRoulette' }, effectiveUserId);
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

function broadcastTournaments(userId) {
  const tournaments = query(
    'SELECT * FROM tournaments WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  broadcast({ type: 'tournaments', tournaments }, userId);
}

// ── State Export/Import ────────────────────────────────────────

// GET /api/state/export — download user's tournament state as JSON
app.get('/api/state/export', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  loadState(user.id);
  const state = publicState(user.id);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="ar-overlay-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(state);
});

// POST /api/state/import — restore user's tournament state from JSON
app.post('/api/state/import', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const imported = req.body;
  if (!imported || typeof imported !== 'object' || Array.isArray(imported)) {
    return res.status(400).json({ error: 'Неверный формат данных — ожидается JSON-объект' });
  }

  loadState(user.id);
  const st = userStates.get(user.id);

  // Merge only game-relevant fields from import
  for (const f of gameFields) {
    if (f in imported) st[f] = imported[f];
  }
  // Reset timer
  st.timer = { remainingMs: 0, totalMs: st.timer?.totalMs ?? 0, running: false, paused: false };

  bump(user.id, 'state-import', 'api', {});
  saveStateNow(user.id);
  broadcast({ type: 'full', state: publicState(user.id), version: st.version }, user.id);

  console.log(`[api] state imported by ${user.email}`);
  res.json({ ok: true, version: st.version });
});

// ── Start ────────────────────────────────────────────────────

async function start() {
  try {
    await initDatabase();
    console.log('[db] database initialized');
    await migrate();
    migrateGlobalState();
  } catch (err) {
    console.error('[startup] database initialization failed:', err.message);
    process.exit(1);
  }

  // Clean up expired sessions on startup + every 6 hours
  cleanupExpiredSessions();
  setInterval(cleanupExpiredSessions, 6 * 60 * 60 * 1000).unref();

  httpServer.listen(PORT, () => {
    console.log(`[production-server] listening on http://0.0.0.0:${PORT}`);
  });
}

start();

// ── Graceful shutdown ─────────────────────────────────────────

function shutdown() {
  console.log('[production-server] shutting down...');
  for (const [userId] of userStates) {
    try { saveStateNow(userId); } catch (_) {}
  }
  try { closeDatabase(); } catch (_) {}
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('uncaughtException', (e) => {
  console.error('[production-server] uncaughtException:', e.message);
  for (const [userId] of userStates) {
    try { saveStateNow(userId); } catch (_) {}
  }
});
process.on('unhandledRejection', (e) => {
  console.error('[production-server] unhandledRejection:', e?.message || e);
});