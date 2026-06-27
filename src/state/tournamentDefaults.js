import { createDefaultLayout } from './layoutDefaults.js';
import randomUUID from '../utils/randomUUID.js';

export const STORAGE_KEY = 'battle-for-respect:v1';

export const defaultTasks = [
  'Убить 3 турели и полностью их обыскать',
  'Обыскать рейдера',
  'Нанести урон по двум разным игрокам',
  'Выжить после PvP-контакта 1 минуту',
  'Установить и запустить рейдерскую ракету',
  'Сбить с ног противника',
];

export const defaultBonusTasks = [
  { id: 'bonus-1', text: 'Бонус 1: выбрать перед раундом', completed: false, reserved: true },
  { id: 'bonus-2', text: 'Бонус 2: выбрать перед раундом', completed: false, reserved: true },
];

export const defaultComplications = [];

export function createTasks() {
  return defaultTasks.map((text, index) => ({
    id: `task-${index + 1}`,
    text,
    points: 1,
    completed: false,
  }));
}

export function createDefaultState() {
  const players = [
    { id: randomUUID(), name: 'Alex', totalPoints: 0 },
    { id: randomUUID(), name: 'Sam', totalPoints: 0 },
  ];

  const teams = [
    {
      id: randomUUID(),
      name: 'North Gate',
      players: [
        { id: randomUUID(), name: 'Alex', totalPoints: 0 },
        { id: randomUUID(), name: 'Sam', totalPoints: 0 },
      ],
      totalPoints: 0,
    },
  ];

  return {
    version: 0,
    mode: '1x1',
    players,
    teams,
    rounds: [],
    currentRound: 1,
    totalRounds: 3,
    tournamentName: 'Битва за Респект',
    soundEnabled: true,
    currentParticipantId: players[0].id,
    currentPoints: 0,
    tasks: [],
    previousPlayerOrTeamId: players[1].id,
    showStandings: false,
    extensions: {
      bonusTasks: defaultBonusTasks,
      complications: defaultComplications,
    },
    overlayLayout: createDefaultLayout(),
    rouletteData: null,
    rouletteItems: [],
    auditLog: [],
    updatedAt: Date.now(),
  };
}