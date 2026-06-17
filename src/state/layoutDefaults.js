export const OVERLAY_WIDTH = 1920;
export const OVERLAY_HEIGHT = 1080;

export const WIDGET_TYPES = ['tournament-name', 'round', 'score', 'tasks', 'timer', 'previous-player', 'standings', 'complications'];

// Base dimensions of each widget type (unscaled, in px @ 1920×1080)
export function getWidgetSize(type, tasks) {
  if (type === 'tasks') {
    const count = (tasks || []).length;
    const cols = count <= 3 ? 1 : 2;
    const rows = Math.ceil(count / cols);
    return { w: 600, h: 36 + rows * 52 + (rows - 1) * 8 };
  }
  if (type === 'timer') return { w: 200, h: 200 };
  if (type === 'tournament-name') return { w: 300, h: 36 };
  if (type === 'round') return { w: 220, h: 30 };
  if (type === 'score') return { w: 260, h: 44 };
  if (type === 'previous-player') return { w: 280, h: 80 };
  if (type === 'standings') return { w: 360, h: 300 };
  if (type === 'complications') {
    // Height based on number of complications, not tasks
    return { w: 500, h: 200 };
  }
  return { w: 120, h: 32 };
}

export function createDefaultLayout() {
  return [
    {
      id: 'tasks',
      type: 'tasks',
      x: 660,
      y: 380,
      scale: 1.0,
      visible: true,
    },
    {
      id: 'tournament-name',
      type: 'tournament-name',
      x: 50,
      y: 880,
      scale: 1.0,
      visible: true,
    },
    {
      id: 'round',
      type: 'round',
      x: 50,
      y: 920,
      scale: 1.0,
      visible: true,
    },
    {
      id: 'score',
      type: 'score',
      x: 50,
      y: 960,
      scale: 1.0,
      visible: true,
    },
    {
      id: 'timer',
      type: 'timer',
      x: 50,
      y: 1020,
      scale: 1.0,
      visible: true,
    },
    {
      id: 'previous-player',
      type: 'previous-player',
      x: 1600,
      y: 880,
      scale: 0.85,
      visible: true,
    },
    {
      id: 'standings',
      type: 'standings',
      x: 1480,
      y: 100,
      scale: 1.0,
      visible: true,
    },
    {
      id: 'complications',
      type: 'complications',
      x: 50,
      y: 640,
      scale: 1.0,
      visible: true,
    },
  ];
}