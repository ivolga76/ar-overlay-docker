import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_KEY, createDefaultState } from './tournamentDefaults.js';
import { createDefaultLayout } from './layoutDefaults.js';
import useServerSync from '../hooks/useServerSync.js';
import { useAuth } from './AuthContext.jsx';
import randomUUID from '../utils/randomUUID.js';

const TournamentContext = createContext(null);

function normalizeState(rawState) {
  const fallback = createDefaultState();
  if (!rawState || typeof rawState !== 'object') {
    return fallback;
  }

  const mode = rawState.mode === '2x2' ? '2x2' : '1x1';
  const players = Array.isArray(rawState.players) ? rawState.players : fallback.players;
  const teams = Array.isArray(rawState.teams) ? rawState.teams : fallback.teams;
  const participantList = mode === '2x2' ? teams : players;
  const currentParticipantId =
    rawState.currentParticipantId || participantList[0]?.id || fallback.currentParticipantId;
  const tasks =
    Array.isArray(rawState.tasks) && rawState.tasks.length
      ? rawState.tasks.map(normalizeTask)
      : [];
  const rounds = Array.isArray(rawState.rounds)
    ? rawState.rounds.map((round) => ({
        ...round,
        tasks: Array.isArray(round.tasks) ? round.tasks.map(normalizeTask) : [],
      }))
    : [];

  return {
    ...fallback,
    ...rawState,
    mode,
    players,
    teams,
    overlayLayout: (() => {
      const saved = Array.isArray(rawState.overlayLayout) && rawState.overlayLayout.length
        ? rawState.overlayLayout
        : createDefaultLayout();
      // Merge defaults: add missing widgets, sync visible for existing
      const defaults = createDefaultLayout();
      const defaultMap = new Map(defaults.map(w => [w.id, w]));
      const savedIds = new Set(saved.map(w => w.id));
      // Only sync visible from default if the widget has no explicit visible field
      const merged = saved.map(w => {
        const d = defaultMap.get(w.id);
        if (!d) return w;
        // Keep user's visible if explicitly set, else take default
        return w.visible !== undefined ? w : { ...w, visible: d.visible };
      });
      const missing = defaults.filter(w => !savedIds.has(w.id));
      return [...merged, ...missing];
    })(),
    timerData: rawState.timerData || { remainingMs: 0, totalMs: 0, running: false, paused: false },
    version: Number(rawState.version ?? fallback.version ?? 0),
    auditLog: Array.isArray(rawState.auditLog) ? rawState.auditLog : fallback.auditLog || [],
    totalRounds: Number(rawState.totalRounds) || fallback.totalRounds || 3,
    tournamentName: rawState.tournamentName || fallback.tournamentName,
    soundEnabled: rawState.soundEnabled !== undefined ? rawState.soundEnabled : true,
    currentRound: clampRound(rawState.currentRound ?? fallback.currentRound, rawState.totalRounds || 3),
    currentParticipantId,
    currentPoints: Number(rawState.currentPoints ?? 0),
    tasks,
    rounds,
    extensions: {
      ...fallback.extensions,
      ...(rawState.extensions || {}),
    },
    rouletteData: rawState.rouletteData || fallback.rouletteData || null,
  };
}

function clampRound(value, max = 3) {
  const round = Number(value);
  if (Number.isNaN(round)) return 1;
  return Math.min(max, Math.max(1, round));
}

function normalizeTask(task) {
  const points = Number(task?.points ?? 1);
  return {
    id: task?.id || randomUUID(),
    text: task?.text || '',
    points: Number.isNaN(points) ? 1 : points,
    completed: Boolean(task?.completed),
  };
}

function getParticipantList(state) {
  return state.mode === '2x2' ? state.teams : state.players;
}

function findParticipant(state, id = state.currentParticipantId) {
  return getParticipantList(state).find((participant) => participant.id === id) || null;
}

function touch(nextState) {
  return { ...nextState, updatedAt: Date.now() };
}

/**
 * Quick comparison of key state fields — returns true if the incoming
 * WebSocket update is semantically identical to current state.
 * Used to prevent unnecessary re-renders from echo broadcasts.
 */
function stateFieldsEqual(current, incoming) {
  // overlayLayout: compare visible, position, scale
  const curLayout = current.overlayLayout;
  const incLayout = incoming.overlayLayout;
  if (curLayout && incLayout) {
    if (curLayout.length !== incLayout.length) return false;
    for (let i = 0; i < curLayout.length; i++) {
      const cw = curLayout[i];
      const iw = incLayout[i];
      if (!cw || !iw) return false;
      if (cw.id !== iw.id) return false;
      if (cw.visible !== iw.visible) return false;
      if (cw.x !== iw.x) return false;
      if (cw.y !== iw.y) return false;
      if (cw.scale !== iw.scale) return false;
    }
  } else if (curLayout !== incLayout) {
    return false;
  }
  // Compare key scalar fields
  if (current.mode !== incoming.mode) return false;
  if (current.currentRound !== incoming.currentRound) return false;
  if (current.currentPoints !== incoming.currentPoints) return false;
  if (current.currentParticipantId !== incoming.currentParticipantId) return false;
  if (current.showStandings !== incoming.showStandings) return false;
  if (current.previousPlayerOrTeamId !== incoming.previousPlayerOrTeamId) return false;
  // Compare tasks length and ids (fast check)
  const curTasks = current.tasks;
  const incTasks = incoming.tasks;
  if (curTasks && incTasks) {
    if (curTasks.length !== incTasks.length) return false;
    for (let i = 0; i < curTasks.length; i++) {
      if (curTasks[i].id !== incTasks[i].id) return false;
      if (curTasks[i].completed !== incTasks[i].completed) return false;
      if (curTasks[i].points !== incTasks[i].points) return false;
    }
  } else if (curTasks !== incTasks) {
    return false;
  }
  // players/teams: compare length and id order
  if (!arrayIdsEqual(current.players, incoming.players)) return false;
  if (!arrayIdsEqual(current.teams, incoming.teams)) return false;
  // extensions: complications list id + bonusTasks length
  if (current.extensions && incoming.extensions) {
    if (!arrayIdsEqual(current.extensions.complications, incoming.extensions.complications)) return false;
    if (!arrayIdsEqual(current.extensions.bonusTasks, incoming.extensions.bonusTasks)) return false;
  } else if (!!current.extensions !== !!incoming.extensions) {
    return false;
  }
  // rounds: compare length and id order
  if (!arrayIdsEqual(current.rounds, incoming.rounds)) return false;
  // rouletteData: compare spinning flag and targetAngle
  const curRD = current.rouletteData;
  const incRD = incoming.rouletteData;
  if (curRD && incRD) {
    if (curRD.spinning !== incRD.spinning) return false;
    if (curRD.targetAngle !== incRD.targetAngle) return false;
    if (curRD.resultIndex !== incRD.resultIndex) return false;
  } else if (!!curRD !== !!incRD) {
    return false;
  }
  return true;
}

/** Fast array comparison by length and id order */
function arrayIdsEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]?.id !== b[i]?.id) return false;
  }
  return true;
}

function updateParticipantCollection(state, updater) {
  if (state.mode === '2x2') {
    return {
      ...state,
      teams: state.teams.map((team) =>
        team.id === state.currentParticipantId ? updater(team) : team,
      ),
    };
  }

  return {
    ...state,
    players: state.players.map((player) =>
      player.id === state.currentParticipantId ? updater(player) : player,
    ),
  };
}

function applyScoreDelta(state, delta) {
  const change = Number(delta) || 0;
  if (change === 0) return state;

  const withParticipant = updateParticipantCollection(state, (participant) => ({
    ...participant,
    totalPoints: Number(participant.totalPoints || 0) + change,
  }));

  return {
    ...withParticipant,
    currentPoints: Number(state.currentPoints || 0) + change,
  };
}

function commitCurrentRound(state) {
  const participant = findParticipant(state);
  if (!participant) return state;

  const entry = {
    id: `${state.mode}-${state.currentRound}-${state.currentParticipantId}`,
    roundNumber: state.currentRound,
    participantType: state.mode === '2x2' ? 'team' : 'player',
    participantId: state.currentParticipantId,
    participantName: participant.name,
    tasks: state.tasks,
    points: state.currentPoints,
    bonusTasks: state.extensions.bonusTasks,
    complications: state.extensions.complications,
    updatedAt: Date.now(),
  };

  const rounds = state.rounds.filter((round) => round.id !== entry.id);
  return { ...state, rounds: [...rounds, entry] };
}

export function TournamentProvider({ children, overlayUserId = null }) {
  const [state, setState] = useState(() => {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch {
      return createDefaultState();
    }
  });

  const syncingFromServer = useRef(false);
  const { token } = useAuth();
  const { send, on, connected } = useServerSync(token, overlayUserId);

  // — WebSocket sync: receive game state ———————————————————————————
  useEffect(() => {
    on('full', (msg) => {
      syncingFromServer.current = true;
      setState((current) => ({
        ...normalizeState(msg.state),
        timerData: { remainingMs: 0, totalMs: 0, running: false, paused: false },
      }));
    });
    on('update', (msg) => {
      syncingFromServer.current = true;
      setState((current) => {
        // Bail out if incoming state is identical - prevents
        // LayoutEditor jitter from WebSocket echo on visibility toggle
        if (msg.state && stateFieldsEqual(current, msg.state)) {
          return current;
        }
        return normalizeState({ ...current, ...msg.state });
      });
    });
    on('updateTasks', (msg) => {
      syncingFromServer.current = true;
      setState((current) => ({ ...current, tasks: msg.tasks.map(normalizeTask) }));
    });
    on('spinRoulette', (msg) => {
      syncingFromServer.current = true;
      setState((current) => ({
        ...current,
        rouletteData: {
          targetAngle: msg.targetAngle,
          resultIndex: msg.resultIndex,
          items: msg.items,
          spinning: true,
        },
      }));
    });
  }, [on]);

  // Push current state to server on first connect AND after reconnect (NO timerData — timer syncs separately)
  const didInitialPush = useRef(false);
  useEffect(() => {
    if (connected && !didInitialPush.current) {
      didInitialPush.current = true;
      const subset = {
        mode: state.mode,
        currentRound: state.currentRound,
        currentPoints: state.currentPoints,
        currentParticipantId: state.currentParticipantId,
        tasks: state.tasks,
        players: state.players,
        teams: state.teams,
        showStandings: state.showStandings,
        extensions: state.extensions,
        rounds: state.rounds,
        overlayLayout: state.overlayLayout,
        previousPlayerOrTeamId: state.previousPlayerOrTeamId,
        rouletteData: state.rouletteData,
      };
      send({ type: 'update', state: subset });
    }
  }, [connected, state, send]);

  // Reset initial push flag on reconnect so state is re-sent to server
  useEffect(() => {
    if (!connected) {
      didInitialPush.current = false;
    }
  }, [connected]);

  // Send state changes to server (only when NOT syncing from server)
  // timerData EXCLUDED — timer has its own sync channel to avoid echo loops
  useEffect(() => {
    if (!connected) return;
    if (syncingFromServer.current) {
      syncingFromServer.current = false;
      return;
    }
    const subset = {
      mode: state.mode,
      currentRound: state.currentRound,
      currentPoints: state.currentPoints,
      currentParticipantId: state.currentParticipantId,
      tasks: state.tasks,
      players: state.players,
      teams: state.teams,
      showStandings: state.showStandings,
      extensions: state.extensions,
      rounds: state.rounds,
      overlayLayout: state.overlayLayout,
      previousPlayerOrTeamId: state.previousPlayerOrTeamId,
      rouletteData: state.rouletteData,
    };
    send({ type: 'update', state: subset });
  }, [state, connected, send]);

  // Listen for timer data from other clients (overlay receives timer from admin)
  useEffect(() => {
    on('timer', (msg) => {
      if (msg.timer) {
        setState((current) => ({ ...current, timerData: msg.timer }));
      }
    });
  }, [on]);

  useEffect(() => {
    // Don't write to localStorage when syncing from server —
    // prevents handleStorage from firing and creating an echo loop
    if (syncingFromServer.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Forward timerData to WS server (Timer component pushes every 500ms)
  const prevTimerRef = useRef(null);
  useEffect(() => {
    if (!connected) return;
    const td = state.timerData;
    if (!td) return;
    // Only send when timerData actually changes
    if (prevTimerRef.current && 
        prevTimerRef.current.remainingMs === td.remainingMs &&
        prevTimerRef.current.running === td.running &&
        prevTimerRef.current.paused === td.paused) return;
    prevTimerRef.current = td;
    send({ type: 'timer', timer: td });
  }, [connected, state.timerData, send]);

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        setState(normalizeState(JSON.parse(event.newValue)));
      } catch {
        setState(createDefaultState());
      }
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setMode = useCallback((mode) => {
    setState((current) => {
      const committed = commitCurrentRound(current);
      const nextMode = mode === '2x2' ? '2x2' : '1x1';
      const list = nextMode === '2x2' ? committed.teams : committed.players;
      return touch({
        ...committed,
        mode: nextMode,
        currentParticipantId: list[0]?.id || '',
        previousPlayerOrTeamId: list[1]?.id || list[0]?.id || '',
        currentPoints: 0,
        tasks: [],
        extensions: { ...committed.extensions, complications: [] },
      });
    });
  }, []);

  const setRound = useCallback((round) => {
    setState((current) => {
      const committed = commitCurrentRound(current);
      const targetRound = clampRound(round);
      const participantType = committed.mode === '2x2' ? 'team' : 'player';

      // Look for a saved entry for this round + current player
      const savedEntry = committed.rounds.find(
        (r) =>
          r.roundNumber === targetRound &&
          r.participantId === committed.currentParticipantId &&
          r.participantType === participantType,
      );

      return touch({
        ...committed,
        currentRound: targetRound,
        currentPoints: savedEntry?.points ?? 0,
        tasks: savedEntry?.tasks ?? [],
        extensions: {
          ...committed.extensions,
          complications: savedEntry?.complications ?? [],
        },
      });
    });
  }, []);

  const selectParticipant = useCallback((participantId) => {
    setState((current) => {
      if (!participantId || participantId === current.currentParticipantId) return current;
      const committed = commitCurrentRound(current);
      const savedEntry = committed.rounds.find(
        (round) =>
          round.roundNumber === committed.currentRound &&
          round.participantId === participantId &&
          round.participantType === (committed.mode === '2x2' ? 'team' : 'player'),
      );

      return touch({
        ...committed,
        previousPlayerOrTeamId: current.currentParticipantId,
        currentParticipantId: participantId,
        currentPoints: savedEntry?.points ?? 0,
        tasks: savedEntry?.tasks ?? [],
        extensions: {
          ...committed.extensions,
          complications: savedEntry?.complications ?? [],
        },
      });
    });
  }, []);

  const updateCurrentName = useCallback((name) => {
    setState((current) =>
      touch(
        updateParticipantCollection(current, (participant) => ({
          ...participant,
          name,
        })),
      ),
    );
  }, []);

  const adjustPoints = useCallback((delta) => {
    setState((current) => touch(applyScoreDelta(current, delta)));
  }, []);

  const setCurrentPoints = useCallback((points) => {
    const value = Number(points);
    if (Number.isNaN(value)) return;

    setState((current) => {
      const delta = value - Number(current.currentPoints || 0);
      const withParticipant = updateParticipantCollection(current, (participant) => ({
        ...participant,
        totalPoints: Number(participant.totalPoints || 0) + delta,
      }));

      return touch({ ...withParticipant, currentPoints: value });
    });
  }, []);

  const updateTask = useCallback((taskId, patch) => {
    setState((current) => {
      let scoreDelta = 0;
      const tasks = current.tasks.map((task) => {
        if (task.id !== taskId) return task;

        const previousPoints = Number(task.points ?? 1) || 0;
        const nextTask = normalizeTask({ ...task, ...patch });
        const nextPoints = Number(nextTask.points ?? 1) || 0;

        if (!task.completed && nextTask.completed) {
          scoreDelta += nextPoints;
        } else if (task.completed && !nextTask.completed) {
          scoreDelta -= previousPoints;
        } else if (task.completed && nextTask.completed && previousPoints !== nextPoints) {
          scoreDelta += nextPoints - previousPoints;
        }

        return nextTask;
      });

      return touch({
        ...applyScoreDelta(current, scoreDelta),
        tasks,
      });
    });
  }, []);

  const addTask = useCallback((text, points = 1) => {
    setState((current) => {
      const taskText = text?.trim() || `Новое задание ${current.tasks.length + 1}`;
      return touch({
        ...current,
        tasks: [
          ...current.tasks,
          {
            id: randomUUID(),
            text: taskText,
            points: Number(points) || 1,
            completed: false,
          },
        ],
      });
    });
  }, []);

  const removeTask = useCallback((taskId) => {
    setState((current) => {
      const task = current.tasks.find((t) => t.id === taskId);
      const scoreDelta = task?.completed ? -(Number(task.points ?? 1) || 0) : 0;
      return touch({
        ...applyScoreDelta(current, scoreDelta),
        tasks: current.tasks.filter((t) => t.id !== taskId),
      });
    });
  }, []);

  const resetTasks = useCallback(() => {
    setState((current) => {
      const scoreDelta = current.tasks.reduce(
        (sum, task) => sum - (task.completed ? Number(task.points ?? 1) || 0 : 0),
        0,
      );

      return touch({
        ...applyScoreDelta(current, scoreDelta),
        tasks: current.tasks.map((task) => ({ ...task, completed: false })),
      });
    });
  }, []);

  const addPlayer = useCallback((name) => {
    const safeName = name.trim();
    if (!safeName) return;

    setState((current) => {
      const player = { id: randomUUID(), name: safeName, totalPoints: 0 };
      return touch({
        ...current,
        players: [...current.players, player],
        currentParticipantId: current.mode === '1x1' ? player.id : current.currentParticipantId,
      });
    });
  }, []);

  const addTeam = useCallback((teamName, firstPlayer, secondPlayer) => {
    const safeTeamName = teamName.trim();
    if (!safeTeamName) return;

    setState((current) => {
      const team = {
        id: randomUUID(),
        name: safeTeamName,
        players: [
          { id: randomUUID(), name: firstPlayer.trim() || 'Player 1', totalPoints: 0 },
          { id: randomUUID(), name: secondPlayer.trim() || 'Player 2', totalPoints: 0 },
        ],
        totalPoints: 0,
      };

      return touch({
        ...current,
        teams: [...current.teams, team],
        currentParticipantId: current.mode === '2x2' ? team.id : current.currentParticipantId,
      });
    });
  }, []);

  const removeParticipant = useCallback((participantId) => {
    setState((current) => {
      if (current.mode === '2x2') {
        const teams = current.teams.filter((team) => team.id !== participantId);
        return touch({
          ...current,
          teams,
          currentParticipantId: teams[0]?.id || '',
          previousPlayerOrTeamId: teams[1]?.id || teams[0]?.id || '',
          currentPoints: 0,
          tasks: [],
        });
      }

      const players = current.players.filter((player) => player.id !== participantId);
      return touch({
        ...current,
        players,
        currentParticipantId: players[0]?.id || '',
        previousPlayerOrTeamId: players[1]?.id || players[0]?.id || '',
        currentPoints: 0,
        tasks: [],
      });
    });
  }, []);

  const toggleStandings = useCallback(() => {
    setState((current) => touch({ ...current, showStandings: !current.showStandings }));
  }, []);

  const setTournamentName = useCallback((name) => {
    setState((current) => touch({ ...current, tournamentName: name }));
  }, []);

  const setTotalRounds = useCallback((n) => {
    setState((current) =>
      touch({ ...current, totalRounds: n, currentRound: clampRound(current.currentRound, n) }),
    );
  }, []);

  const setSoundEnabled = useCallback((enabled) => {
    setState((current) => touch({ ...current, soundEnabled: enabled }));
  }, []);

  const updateLayout = useCallback((widgetId, patch) => {
    setState((current) => touch({
      ...current,
      overlayLayout: current.overlayLayout.map((w) =>
        w.id === widgetId ? { ...w, ...patch } : w
      ),
    }));
  }, []);

  const resetLayout = useCallback(() => {
    setState((current) => touch({ ...current, overlayLayout: createDefaultLayout() }));
  }, []);

  const setFullLayout = useCallback((newLayout) => {
    if (!Array.isArray(newLayout) || !newLayout.length) return;
    setState((current) => touch({ ...current, overlayLayout: newLayout.map(w => ({ ...w })) }));
  }, []);

  const toggleWidgetVisibility = useCallback((widgetId) => {
    setState((current) => {
      // Standings "focus mode": toggling standings hides/shows all other widgets
      if (widgetId === 'standings') {
        const standingsW = current.overlayLayout.find(w => w.id === 'standings');
        const standingsBecomingVisible = standingsW ? standingsW.visible === false : true;
        return touch({
          ...current,
          overlayLayout: current.overlayLayout.map((w) => {
            if (w.id === 'standings') return { ...w, visible: standingsBecomingVisible };
            // Other widgets: hide when standings appears, show when standings disappears
            return { ...w, visible: !standingsBecomingVisible };
          }),
        });
      }
      // Normal toggle for other widgets
      return touch({
        ...current,
        overlayLayout: current.overlayLayout.map((w) =>
          w.id === widgetId ? { ...w, visible: !(w.visible !== false) } : w
        ),
      });
    });
  }, []);


  const resetTournament = useCallback(() => {
    setState(createDefaultState());
  }, []);

  const addBonusTask = useCallback((text) => {
    if (!text?.trim()) return;
    setState((current) => ({
      ...current,
      extensions: {
        ...current.extensions,
        bonusTasks: [
          ...(current.extensions?.bonusTasks || []),
          { id: randomUUID(), text: text.trim() },
        ],
      },
    }));
  }, []);

  const removeBonusTask = useCallback((id) => {
    setState((current) => ({
      ...current,
      extensions: {
        ...current.extensions,
        bonusTasks: (current.extensions?.bonusTasks || []).filter(b => b.id !== id),
      },
    }));
  }, []);

  const addComplication = useCallback((text) => {
    if (!text?.trim()) return;
    setState((current) => ({
      ...current,
      extensions: {
        ...current.extensions,
        complications: [
          ...(current.extensions?.complications || []),
          { id: randomUUID(), text: text.trim() },
        ],
      },
    }));
  }, []);

  const updateComplication = useCallback((id, patch) => {
    setState((current) => ({
      ...current,
      extensions: {
        ...current.extensions,
        complications: (current.extensions?.complications || []).map((c) =>
          c.id === id ? { ...c, ...patch } : c
        ),
      },
    }));
  }, []);

  const removeComplication = useCallback((id) => {
    setState((current) => ({
      ...current,
      extensions: {
        ...current.extensions,
        complications: (current.extensions?.complications || []).filter(c => c.id !== id),
      },
    }));
  }, []);

  const setTimerData = useCallback((data) => {
    setState((current) => touch({ ...current, timerData: { ...current.timerData, ...data } }));
  }, []);

  const spinRoulette = useCallback(() => {
    const items = state.tasks;
    if (!items.length) return;
    const resultIndex = Math.floor(Math.random() * items.length);
    const sectorAngle = 360 / items.length;
    // Random angle within the winning sector, plus multiple full rotations for visual spin
    const sectorStart = resultIndex * sectorAngle;
    const jitter = Math.random() * sectorAngle;
    const targetAngle = 360 * 5 + (360 - sectorStart - jitter); // 5 full rotations + land on sector
    const data = { targetAngle, resultIndex, items };
    setState((current) => ({ ...current, rouletteData: { ...data, spinning: true } }));
    if (connected) {
      send({ type: 'spinRoulette', ...data });
    }
  }, [state.tasks, connected, send]);

  // Memoize standings separately — prevents cascade re-renders on timer ticks
  const standings = useMemo(() => {
    const participants = state.mode === '2x2' ? state.teams : state.players;
    return [...participants].sort(
      (a, b) => Number(b.totalPoints || 0) - Number(a.totalPoints || 0),
    );
  }, [state.mode, state.players, state.teams]);

  const value = useMemo(() => {
    const participants = getParticipantList(state);
    const currentParticipant = findParticipant(state);
    const previousParticipant = findParticipant(state, state.previousPlayerOrTeamId);

    return {
      state,
      participants,
      currentParticipant,
      previousParticipant,
      standings,
      syncingFromServer,
      setMode,
      setRound,
      selectParticipant,
      updateCurrentName,
      adjustPoints,
      setCurrentPoints,
      updateTask,
      addTask,
      removeTask,
      resetTasks,
      addPlayer,
      addTeam,
      removeParticipant,
      toggleStandings,
      setTournamentName,
      setTotalRounds,
      setSoundEnabled,
      updateLayout,
      resetLayout,
      setFullLayout,
      toggleWidgetVisibility,
      resetTournament,
      addBonusTask,
      removeBonusTask,
      addComplication,
      updateComplication,
      removeComplication,
      setTimerData,
      spinRoulette,
    };
  }, [
    state,
    setMode,
    setRound,
    selectParticipant,
    updateCurrentName,
    adjustPoints,
    setCurrentPoints,
    updateTask,
    addTask,
    removeTask,
    resetTasks,
    addPlayer,
    addTeam,
    removeParticipant,
    toggleStandings,
    setTournamentName,
    setTotalRounds,
    setSoundEnabled,
      updateLayout,
      resetLayout,
      setFullLayout,
      toggleWidgetVisibility,
      resetTournament,
      addBonusTask,
      removeBonusTask,
    addComplication,
    updateComplication,
    removeComplication,
    setTimerData,
    spinRoulette,
  ]);

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used inside TournamentProvider');
  }
  return context;
}