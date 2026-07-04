// shared/state-fields.js — canonical constants for tournament state
// Imported by both production-server.js (server) and referenced by
// src/state/tournamentDefaults.js (client). Keep in sync.

export const GAME_FIELDS = [
  'mode', 'currentRound', 'currentPoints', 'currentParticipantId',
  'tasks', 'players', 'teams', 'showStandings', 'extensions', 'rounds',
  'previousPlayerOrTeamId', 'overlayLayout', 'totalRounds', 'tournamentName', 'soundEnabled',
  'rouletteItems', 'rouletteVariant', 'rouletteSpinDuration',
];

export const DEFAULT_STATE = {
  version: 0,
  tasks: [],
  rouletteItems: [],
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
