import express from 'express';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { initDatabase, getDb, query, queryOne, run, closeDatabase, saveToDisk } from './db/connection.js';
import { migrate } from './db/migrate.js';

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

function findSession(token) {
  const rows = query('SELECT * FROM sessions WHERE token = ?', [token]);
  return rows[0] || null;
}

function authenticate(req) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  const session = findSession(token);
  if (!session) return null;
  return findUserById(session.user_id);
}

function findUserById(id) {
  const rows = query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
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
  const userId = randomUUID();
  const now = new Date().toISOString();
  run(
    'INSERT INTO users (id, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)',
    [userId, cleanEmail, hashPassword(password, salt), salt, now]
  );

  const token = randomUUID();
  run('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)', [token, userId, now]);
  saveToDisk();

  console.log(`[auth] registered user: ${cleanEmail}`);
  res.status(201).json({ token, user: { email: cleanEmail, id: userId } });
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
  if (!timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.password_hash, 'hex'))) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  const token = randomUUID();
  run('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)',
    [token, user.id, new Date().toISOString()]);
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

  const { name, mode, totalRounds, participants, tasks } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Название турнира обязательно' });
  }

  const tournamentMode = mode === '2x2' ? '2x2' : '1x1';
  const rounds = Math.max(1, Math.min(20, parseInt(totalRounds) || 3));
  const tournamentId = randomUUID();
  const now = new Date().toISOString();

  run(
    'INSERT INTO tournaments (id, user_id, name, mode, status, total_rounds) VALUES (?, ?, ?, ?, ?, ?)',
    [tournamentId, user.id, name.trim(), tournamentMode, 'draft', rounds]
  );

  // Create participants
  if (Array.isArray(participants) && participants.length > 0) {
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const pid = randomUUID();
      run(
        'INSERT INTO tournament_participants (id, tournament_id, name, type, sort_order) VALUES (?, ?, ?, ?, ?)',
        [pid, tournamentId, p.name || `Участник ${i + 1}`, p.type || 'player', i]
      );
      if (p.type === 'team' && Array.isArray(p.players)) {
        for (let j = 0; j < p.players.length; j++) {
          const pn = typeof p.players[j] === 'string' ? p.players[j] : p.players[j].name;
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
        run(
          'INSERT INTO tournament_participants (id, tournament_id, name, type, sort_order) VALUES (?, ?, ?, ?, ?)',
          [randomUUID(), tournamentId, `Игрок ${i + 1}`, 'player', i]
        );
      }
    } else {
      for (let i = 0; i < 2; i++) {
        const pid = randomUUID();
        run(
          'INSERT INTO tournament_participants (id, tournament_id, name, type, sort_order) VALUES (?, ?, ?, ?, ?)',
          [pid, tournamentId, `Команда ${i + 1}`, 'team', i]
        );
        for (let j = 0; j < 2; j++) {
          run(
            'INSERT INTO participant_members (participant_id, player_name, sort_order) VALUES (?, ?, ?)',
            [pid, `Игрок ${j + 1}`, j]
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

// GET /api/tournaments — list user's tournaments
app.get('/api/tournaments', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const tournaments = query(
    'SELECT * FROM tournaments WHERE user_id = ? ORDER BY created_at DESC',
    [user.id]
  );
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
  broadcastTournaments(user.id);
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

  broadcastTournaments(user.id);
  console.log(`[api] tournament deleted: "${tournament.name}"`);
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
  activeTournaments.set(user.id, tournament.id);

  const updated = queryOne('SELECT * FROM tournaments WHERE id = ?', [tournament.id]);
  broadcastTournaments(user.id);
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

  // Sync userState rounds → round_results (if user has active game state)
  const userState = userStates.get(user.id);
  if (userState && Array.isArray(userState.rounds) && userState.rounds.length > 0) {
    // Build name→id mapping for participants
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
  activeTournaments.delete(user.id);

  const updated = queryOne('SELECT * FROM tournaments WHERE id = ?', [tournament.id]);
  broadcastTournaments(user.id);
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
       u.display_name as organizer_name
     FROM tournament_standings ts
     JOIN tournament_participants tp ON ts.participant_id = tp.id
     JOIN tournaments t ON ts.tournament_id = t.id
     JOIN users u ON t.user_id = u.id
     WHERE t.status = 'completed'
     ORDER BY ts.total_points DESC
     LIMIT ?`,
    [limit]
  );

  res.json({ leaderboard: rows });
});

// GET /api/leaderboard/:tournamentId — per-tournament (public)
app.get('/api/leaderboard/:tournamentId', (req, res) => {
  const { tournamentId } = req.params;

  const tournament = queryOne('SELECT * FROM tournaments WHERE id = ?', [tournamentId]);
  if (!tournament) {
    return res.status(404).json({ error: 'Турнир не найден' });
  }

  let standings;
  if (tournament.status === 'completed') {
    standings = query(
      `SELECT ts.*, tp.name as participant_name, tp.type as participant_type
       FROM tournament_standings ts
       JOIN tournament_participants tp ON ts.participant_id = tp.id
       WHERE ts.tournament_id = ?
       ORDER BY ts.rank`,
      [tournamentId]
    );
  } else {
    // Live standings from round_results
    standings = query(
      `SELECT 
         tp.id as participant_id,
         tp.name as participant_name,
         tp.type as participant_type,
         COALESCE(SUM(rr.points_earned), 0) as total_points
       FROM tournament_participants tp
       LEFT JOIN round_results rr ON tp.id = rr.participant_id
       WHERE tp.tournament_id = ?
       GROUP BY tp.id
       ORDER BY total_points DESC`,
      [tournamentId]
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

  httpServer.listen(PORT, () => {
    console.log(`[production-server] listening on http://0.0.0.0:${PORT}`);
  });
}

start();

// ── Graceful shutdown ─────────────────────────────────────────

function shutdown() {
  console.log('[production-server] shutting down...');
  for (const [userId] of userStates) {
    try { saveState(userId); } catch (_) {}
  }
  try { closeDatabase(); } catch (_) {}
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('uncaughtException', (e) => {
  console.error('[production-server] uncaughtException:', e.message);
  for (const [userId] of userStates) {
    try { saveState(userId); } catch (_) {}
  }
});
process.on('unhandledRejection', (e) => {
  console.error('[production-server] unhandledRejection:', e?.message || e);
});
