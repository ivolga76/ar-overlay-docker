import { WebSocketServer } from 'ws';

const PORT = 3002;

// Shared game state — single source of truth
const state = {
  tasks: [],
  currentRound: 1,
  currentPoints: 0,
  currentParticipantId: null,
  participants: [],
  timer: { remainingMs: 0, running: false, until: null }
};

function broadcast(data, exclude = null) {
  const json = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client !== exclude && client.readyState === 1) {
      try { client.send(json); } catch (_) {}
    }
  });
}

const wss = new WebSocketServer({ port: PORT });
console.log(`[sync-server] V2-UPDATE-FIX WebSocket started on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  const id = Date.now() % 10000;
  console.log(`[sync-server] client #${id} connected (total: ${wss.clients.size})`);

  // Send current state to new client immediately
  try {
    ws.send(JSON.stringify({ type: 'full', state: { ...state } }));
    // Also send timer state separately so the Timer component picks it up
    if (state.timer.running || state.timer.remainingMs > 0) {
      ws.send(JSON.stringify({ type: 'timer', timer: { ...state.timer } }));
    }
  } catch (_) {}

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      switch (msg.type) {
        case 'full': {
          // Client sends its state (e.g. admin on connect)
          if (msg.state && msg.state.tasks) {
            Object.assign(state, msg.state);
            broadcast({ type: 'full', state: { ...state } }, ws);
          }
          break;
        }
        case 'update': {
          if (msg.state) {
            // Merge game state only (no timer)
            const gameFields = ['mode', 'currentRound', 'currentPoints', 'currentParticipantId',
              'tasks', 'players', 'teams', 'showStandings', 'extensions', 'rounds',
              'previousPlayerOrTeamId'];
            for (const f of gameFields) {
              if (f in msg.state) state[f] = msg.state[f];
            }
            // Broadcast as 'update' — smaller, and clients know it's game-only
            broadcast({ type: 'update', state: msg.state }, ws);
          }
          break;
        }
        case 'updateTasks': {
          if (msg.tasks) {
            state.tasks = msg.tasks;
            broadcast({ type: 'updateTasks', tasks: msg.tasks }, ws);
          }
          break;
        }
        case 'timer': {
          if (msg.timer) {
            state.timer = msg.timer;
            broadcast({ type: 'timer', timer: msg.timer }, ws);
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

// Keep alive — never crash on unhandled errors
process.on('uncaughtException', (e) => {
  console.error('[sync-server] uncaughtException:', e.message);
});
process.on('unhandledRejection', (e) => {
  console.error('[sync-server] unhandledRejection:', e?.message || e);
});
