export const OVERLAY_WIDTH = 1920;
export const OVERLAY_HEIGHT = 1080;

export const WIDGET_TYPES = ['tournament-name', 'round', 'score', 'tasks', 'timer', 'previous-player', 'standings', 'complications'];

// Base dimensions of each widget type (unscaled, in px @ 1920×1080)
export function getWidgetSize(type, tasks, complications) {
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
    const count = (complications || []).length;
    const rows = Math.max(1, count);
    return { w: 500, h: 28 + rows * 32 + (rows - 1) * 4 };
  }
  return { w: 120, h: 32 };
}

// ── Layout profiles (localStorage) ──────────────────────────────────

const PROFILES_KEY = 'ar_overlay_layout_profiles';
const ACTIVE_PROFILE_KEY = 'ar_overlay_active_profile';

export function getLayoutProfiles() {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveLayoutProfile(name, layout) {
  const profiles = getLayoutProfiles();
  profiles[name] = layout.map(w => ({ ...w }));
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function deleteLayoutProfile(name) {
  const profiles = getLayoutProfiles();
  delete profiles[name];
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  if (getActiveProfileName() === name) {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
}

export function loadLayoutProfile(name) {
  const profiles = getLayoutProfiles();
  const profile = profiles[name];
  return profile ? profile.map(w => ({ ...w })) : null;
}

export function getProfileNames() {
  return Object.keys(getLayoutProfiles());
}

export function getActiveProfileName() {
  return localStorage.getItem(ACTIVE_PROFILE_KEY) || '';
}

export function setActiveProfileName(name) {
  if (name) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, name);
  } else {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
}

export function createDefaultLayout() {
  return [
    {
      id: 'tasks',
      type: 'tasks',
      x: 1300,
      y: 7,
      scale: 1.0,
      visible: true,
    },
    {
      id: 'tournament-name',
      type: 'tournament-name',
      x: 10,
      y: 2,
      scale: 1.0,
      visible: true,
    },
    {
      id: 'round',
      type: 'round',
      x: 11,
      y: 36,
      scale: 1.0,
      visible: true,
    },
    {
      id: 'score',
      type: 'score',
      x: 474,
      y: 953,
      scale: 1.2,
      visible: true,
    },
    {
      id: 'timer',
      type: 'timer',
      x: 856,
      y: 886,
      scale: 1.0,
      visible: true,
    },
    {
      id: 'previous-player',
      type: 'previous-player',
      x: 1584,
      y: 930,
      scale: 1.25,
      visible: true,
    },
    {
      id: 'standings',
      type: 'standings',
      x: 1480,
      y: 100,
      scale: 1.0,
      visible: false,
    },
    {
      id: 'complications',
      type: 'complications',
      x: 1300,
      y: 244,
      scale: 1.0,
      visible: true,
    },
  ];
}