import { memo, useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTournament } from '../state/TournamentContext';
import { WIDGET_TYPES, OVERLAY_WIDTH, OVERLAY_HEIGHT, createDefaultLayout, getWidgetSize, getProfileNames, saveLayoutProfile, loadLayoutProfile, deleteLayoutProfile, getActiveProfileName, setActiveProfileName } from '../state/layoutDefaults';

const WIDGET_LABELS = {
  'tournament-name': 'Название',
  'round': 'Раунд',
  'score': 'Счёт',
  'tasks': 'Задачи',
  'timer': 'Таймер',
  'previous-player': 'Пред. игрок',
  'standings': 'Версус',
  'complications': 'Усложнения',
};

export default function LayoutEditor() {
  const { state, updateLayout, resetLayout, setFullLayout, toggleWidgetVisibility, standings, currentParticipant, previousParticipant } = useTournament();
  const layout = state.overlayLayout;
  const tasks = state.tasks;
  const complications = state.extensions?.complications || [];

  const [profileNames, setProfileNames] = useState(() => getProfileNames());
  const [activeProfile, setActiveProfile] = useState(() => getActiveProfileName());
  const [profileInput, setProfileInput] = useState('');
  const [profileMsg, setProfileMsg] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const dragPosRef = useRef({ x: 0, y: 0 });
  const wheelTimerRef = useRef(null);
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: 960, h: 540 });

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ w: rect.width - 32, h: rect.height - 32 });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const scaleFactor = useMemo(() => Math.min(
    containerSize.w / OVERLAY_WIDTH,
    containerSize.h / OVERLAY_HEIGHT,
    1.0
  ), [containerSize.w, containerSize.h]);

  const toLayout = useCallback((sx, sy) => ({
    x: Math.round(sx / scaleFactor),
    y: Math.round(sy / scaleFactor),
  }), [scaleFactor]);

  const handleMouseDown = useCallback((e, widget) => {
    e.preventDefault();
    setSelectedId(widget.id);
    const containerRect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - containerRect.left - 16;
    const my = e.clientY - containerRect.top - 16;
    const sx = widget.x * scaleFactor;
    const sy = widget.y * scaleFactor;
    dragPosRef.current = { x: widget.x, y: widget.y };
    setDragging({ id: widget.id, offsetX: mx - sx, offsetY: my - sy });
  }, [scaleFactor]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e) => {
      const containerRect = containerRef.current.getBoundingClientRect();
      const mx = e.clientX - containerRect.left - 16;
      const my = e.clientY - containerRect.top - 16;
      const newSx = mx - dragging.offsetX;
      const newSy = my - dragging.offsetY;
      const { x, y } = toLayout(
        Math.max(0, Math.min(newSx, OVERLAY_WIDTH * scaleFactor - 100)),
        Math.max(0, Math.min(newSy, OVERLAY_HEIGHT * scaleFactor - 30)),
      );
      dragPosRef.current = { x, y };
      setDragging((prev) => prev ? { ...prev, _tick: Date.now() } : null);
    };
    const handleUp = () => {
      updateLayout(dragging.id, dragPosRef.current);
      setDragging(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, scaleFactor, toLayout, updateLayout]);

  const handleWheel = useCallback((e) => {
    if (!selectedId) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const widget = layout.find(w => w.id === selectedId);
    if (!widget) return;
    const newScale = Math.max(0.3, Math.min(3.0, (widget.scale || 1) + delta));
    const rounded = Math.round(newScale * 100) / 100;
    if (!dragging || dragging.offsetX === undefined) {
      dragPosRef.current = { x: widget.x, y: widget.y, scale: rounded };
    } else {
      dragPosRef.current = { ...dragPosRef.current, scale: rounded };
    }
    setDragging((prev) => prev ? { ...prev, _tick: Date.now() } : { id: selectedId, _tick: Date.now() });
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = setTimeout(() => {
      updateLayout(selectedId, { scale: rounded });
      setDragging(null);
      wheelTimerRef.current = null;
    }, 200);
  }, [selectedId, layout, updateLayout, dragging]);

  const selectedWidget = useMemo(() =>
    layout.find(w => w.id === selectedId),
    [layout, selectedId]
  );

  const overlayData = useMemo(() => ({
    tournamentName: state.tournamentName,
    currentRound: state.currentRound,
    totalRounds: state.totalRounds,
    name: currentParticipant?.name,
    points: currentParticipant?.totalPoints ?? 0,
    tasks: state.tasks || [],
    previousPlayer: previousParticipant,
    showStandings: state.showStandings,
    standings,
    complications: state.extensions?.complications || [],
  }), [
    state.tournamentName, state.currentRound, state.totalRounds,
    currentParticipant, state.tasks, previousParticipant,
    state.showStandings, standings, state.extensions?.complications,
  ]);

  const widgets = useMemo(() =>
    renderWidgets(layout, overlayData, scaleFactor, handleMouseDown, selectedId, dragging, dragPosRef, toggleWidgetVisibility),
    [layout, overlayData, scaleFactor, handleMouseDown, selectedId, dragging, toggleWidgetVisibility]
  );

  const refreshProfiles = useCallback(() => { setProfileNames(getProfileNames()); }, []);
  const handleSaveProfile = useCallback(() => {
    const name = profileInput.trim();
    if (!name) { setProfileMsg('Введите имя профиля'); return; }
    saveLayoutProfile(name, layout);
    setActiveProfile(name);
    setActiveProfileName(name);
    setProfileInput('');
    setProfileMsg(`Профиль «${name}» сохранён`);
    refreshProfiles();
  }, [profileInput, layout, refreshProfiles]);

  const handleLoadProfile = useCallback((name) => {
    if (!name) return;
    const profile = loadLayoutProfile(name);
    if (profile) {
      setFullLayout(profile);
      setActiveProfile(name);
      setActiveProfileName(name);
      setProfileMsg(`Загружен профиль «${name}»`);
    } else {
      setProfileMsg(`Профиль «${name}» не найден`);
    }
  }, [setFullLayout]);

  const handleDeleteProfile = useCallback((name) => {
    if (!name) return;
    deleteLayoutProfile(name);
    if (activeProfile === name) setActiveProfile('');
    setProfileMsg(`Профиль «${name}» удалён`);
    refreshProfiles();
  }, [activeProfile, refreshProfiles]);

  const handleResetLayout = useCallback(() => {
    const defaults = createDefaultLayout();
    setFullLayout(defaults);
    const defaultName = 'Дефолт';
    saveLayoutProfile(defaultName, defaults);
    setActiveProfile(defaultName);
    setActiveProfileName(defaultName);
    setProfileMsg('Загружен дефолтный профиль');
    refreshProfiles();
  }, [setFullLayout, refreshProfiles]);

  return (
    <div className="layout-editor">
      <div className="layout-toolbar">
        <span className="layout-info">
          Поле {OVERLAY_WIDTH}×{OVERLAY_HEIGHT}
          {selectedWidget && ` | ${WIDGET_LABELS[selectedWidget.type]}: scale ${selectedWidget.scale || 1}`}
          {activeProfile && <span className="layout-profile-badge">Профиль: {activeProfile}</span>}
        </span>
      </div>
      <div className="layout-body">
        <div className="layout-profile-sidebar">
          <div className="sidebar-title">Профили расстановки</div>
          {profileMsg && <span className="layout-profile-msg">{profileMsg}</span>}
          <div className="sidebar-divider" />
          <input className="layout-profile-input" type="text" value={profileInput}
            onChange={(e) => setProfileInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
            placeholder="Имя профиля..." />
          <button className="admin-btn admin-btn-sm admin-btn-full" onClick={handleSaveProfile}>Сохранить</button>
          {activeProfile && (
            <button className="admin-btn admin-btn-sm admin-btn-danger admin-btn-full" onClick={() => handleDeleteProfile(activeProfile)}>Удалить профиль</button>
          )}
          {profileNames.length > 0 && (
            <div className="sidebar-profile-list">
              <div className="sidebar-divider" />
              <div className="sidebar-subtitle">Сохранённые:</div>
              {profileNames.map(name => (
                <div key={name} className={`sidebar-profile-item ${name === activeProfile ? 'active' : ''}`}
                  onClick={() => handleLoadProfile(name)}>{name}</div>
              ))}
            </div>
          )}
          <div className="sidebar-divider" />
          <button className="admin-btn admin-btn-sm admin-btn-full" onClick={handleResetLayout}>Сбросить расстановку</button>
        </div>
        <div ref={containerRef} className="layout-canvas-wrapper" onWheel={handleWheel}>
          <div className="layout-canvas" style={{ width: OVERLAY_WIDTH * scaleFactor, height: OVERLAY_HEIGHT * scaleFactor }}>
            <svg className="layout-grid" width={OVERLAY_WIDTH * scaleFactor} height={OVERLAY_HEIGHT * scaleFactor}>
              <defs>
                <pattern id="grid" width={40 * scaleFactor} height={40 * scaleFactor} patternUnits="userSpaceOnUse">
                  <path d={`M ${40 * scaleFactor} 0 L 0 0 0 ${40 * scaleFactor}`} fill="none" stroke="rgba(114,217,255,0.08)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              <line x1={OVERLAY_WIDTH / 2 * scaleFactor} y1="0" x2={OVERLAY_WIDTH / 2 * scaleFactor} y2={OVERLAY_HEIGHT * scaleFactor} stroke="rgba(114,217,255,0.15)" strokeWidth="1" />
              <line x1="0" y1={OVERLAY_HEIGHT / 2 * scaleFactor} x2={OVERLAY_WIDTH * scaleFactor} y2={OVERLAY_HEIGHT / 2 * scaleFactor} stroke="rgba(114,217,255,0.15)" strokeWidth="1" />
            </svg>
            {widgets}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Preview components — render at scaled size directly (no CSS transform) ────

// Base font sizes from overlay CSS (styles.css)
const OV = {
  title: 38,
  round: 18,
  player: 32,
  score: 38,
  tasksHeader: 16,
  taskName: 14,
  taskCost: 12,
  taskPadding: 8,
  taskGap: 8,
  taskRadius: 8,
  compHeader: 16,
  compText: 13,
  compGap: 8,
  compListGap: 4,
  vsHeader: 16,
  vsName: 16,
  vsScore: 14,
  vsTeamMinW: 80,
  vsRowPad: 6,
  prevHeader: 16,
  prevName: 18,
  prevScore: 16,
  timerRing: 48,
  timerStroke: 4,
  timerText: 14,
};

function TournamentNamePreview({ data, fs }) {
  return (
    <div className="overlay-widget-inner">
      <div className="overlay-title" style={{ fontSize: fs(OV.title) }}>{data.tournamentName || 'Битва за Респект'}</div>
    </div>
  );
}

function RoundPreview({ data, fs }) {
  return (
    <div className="overlay-widget-inner">
      <div className="overlay-round" style={{ fontSize: fs(OV.round), marginTop: 0 }}>
        Раунд {data.currentRound} из {data.totalRounds}
      </div>
    </div>
  );
}

function ScorePreview({ data, fs }) {
  return (
    <div className="overlay-widget-inner">
      <div className="overlay-score-row">
        <span className="overlay-player" style={{ fontSize: fs(OV.player), marginTop: 0 }}>{data.name || '---'}</span>
        <span className="overlay-score" style={{ fontSize: fs(OV.score), marginTop: 0 }}>{data.points ?? 0} очк.</span>
      </div>
    </div>
  );
}

function TasksPreview({ data, fs }) {
  const tasks = data.tasks || [];
  const completed = tasks.filter(t => t.completed).length;
  return (
    <div className="overlay-widget-inner">
      <div className="overlay-tasks-header" style={{ fontSize: fs(OV.tasksHeader), marginBottom: fs(4), padding: 0 }}>
        Задачи раунда ({completed}/{tasks.length})
      </div>
      <div className={tasks.length <= 3 ? `overlay-tasks-grid tasks-row-${tasks.length}` : 'overlay-tasks-grid tasks-multi'}
        style={{ gap: fs(OV.taskGap) }}>
        {tasks.map((task) => (
          <div key={task.id} className={`overlay-task-tile ${task.completed ? 'completed' : ''}`}
            style={{ fontSize: fs(OV.taskName), padding: `${fs(OV.taskPadding / 2)} ${fs(OV.taskPadding)}`, borderRadius: fs(OV.taskRadius), gap: fs(OV.taskGap) }}>
            <div className="task-name" style={{ fontSize: fs(OV.taskName) }}>{task.text}</div>
            <div className="task-cost" style={{ fontSize: fs(OV.taskCost) }}>{task.points} очк.</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimerPreview({ fs, ns }) {
  const r = ns(OV.timerRing / 2);
  const sw = ns(OV.timerStroke);
  const dim = r * 2 + sw * 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="overlay-widget-inner">
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
        <circle cx={r + sw} cy={r + sw} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={sw} />
        <circle cx={r + sw} cy={r + sw} r={r} fill="none" stroke="var(--cyan)" strokeWidth={sw}
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round"
          transform={`rotate(-90 ${r + sw} ${r + sw})`} />
        <text x="50%" y="55%" textAnchor="middle" fill="var(--cyan)" fontSize={ns(OV.timerText)} fontWeight="600" fontFamily="var(--display-font)">
          1:30
        </text>
      </svg>
    </div>
  );
}

function PreviousPlayerPreview({ data, fs }) {
  if (!data.previousPlayer) {
    return (
      <div className="overlay-widget-inner">
        <div className="overlay-tasks-header" style={{ fontSize: fs(OV.prevHeader), marginBottom: fs(2), padding: 0 }}>Предыдущий игрок</div>
        <div style={{ fontSize: fs(OV.prevName), color: 'var(--muted)' }}>—</div>
      </div>
    );
  }
  return (
    <div className="overlay-widget-inner">
      <div className="overlay-tasks-header" style={{ fontSize: fs(OV.prevHeader), marginBottom: fs(2), padding: 0 }}>Предыдущий игрок</div>
      <div className="overlay-player" style={{ fontSize: fs(OV.prevName), marginTop: 0 }}>{data.previousPlayer.name}</div>
      <div className="overlay-score" style={{ fontSize: fs(OV.prevScore), opacity: 0.7, marginTop: 0 }}>{data.previousPlayer.totalPoints ?? 0} очк.</div>
    </div>
  );
}

function StandingsPreview({ data, fs }) {
  const list = data.standings || [];
  if (!list.length) {
    return (
      <div className="overlay-widget-inner">
        <div className="overlay-tasks-header vs-header" style={{ fontSize: fs(OV.vsHeader), marginBottom: fs(2), padding: 0 }}>vs</div>
        <div style={{ fontSize: fs(OV.vsName), color: 'var(--muted)' }}>Нет данных</div>
      </div>
    );
  }
  const pairs = [];
  for (let i = 0; i < list.length; i += 2) {
    pairs.push({ left: list[i], right: list[i + 1] || null });
  }
  return (
    <div className="overlay-widget-inner">
      <div className="overlay-tasks-header vs-header" style={{ fontSize: fs(OV.vsHeader), marginBottom: fs(2), padding: 0 }}>vs</div>
      <div className="vs-scoreboard" style={{ gap: fs(2) }}>
        {pairs.map((pair) => (
          <div key={pair.left.id} className="vs-row" style={{ padding: `${fs(OV.vsRowPad / 2)} 0`, animation: 'none' }}>
            <div className="vs-team vs-team-left" style={{ minWidth: fs(OV.vsTeamMinW) }}>
              <span className="vs-name" style={{ fontSize: fs(OV.vsName) }}>{pair.left.name}</span>
            </div>
            <div className="vs-score-block">
              <span className="vs-score vs-score-left" style={{ fontSize: fs(OV.vsScore) }}>{pair.left.totalPoints ?? 0}</span>
              <span className="vs-colon" style={{ fontSize: fs(OV.vsScore) }}>:</span>
              <span className="vs-score vs-score-right" style={{ fontSize: fs(OV.vsScore) }}>{pair.right ? pair.right.totalPoints ?? 0 : 0}</span>
            </div>
            <div className="vs-team vs-team-right" style={{ minWidth: fs(OV.vsTeamMinW) }}>
              {pair.right && <span className="vs-name" style={{ fontSize: fs(OV.vsName) }}>{pair.right.name}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplicationsPreview({ data, fs }) {
  const comps = data.complications || [];
  if (!comps.length) {
    return (
      <div className="overlay-widget-inner">
        <div className="overlay-tasks-header" style={{ fontSize: fs(OV.compHeader), marginBottom: fs(2), padding: 0 }}>Усложнения (0)</div>
        <div style={{ fontSize: fs(OV.compText), color: 'var(--muted)' }}>Нет активных усложнений</div>
      </div>
    );
  }
  return (
    <div className="overlay-widget-inner">
      <div className="overlay-tasks-header" style={{ fontSize: fs(OV.compHeader), marginBottom: fs(2), padding: 0 }}>
        Усложнения ({comps.length})
      </div>
      <div className="overlay-complications-list" style={{ gap: fs(OV.compListGap) }}>
        {comps.map((comp) => (
          <div key={comp.id} className="overlay-complication-item" style={{ padding: '1px 0', gap: fs(OV.compGap) }}>
            <span className="complication-text" style={{ fontSize: fs(OV.compText) }}>{comp.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PREVIEW_COMPONENTS = {
  'tournament-name': TournamentNamePreview,
  'round': RoundPreview,
  'score': ScorePreview,
  'tasks': TasksPreview,
  'timer': TimerPreview,
  'previous-player': PreviousPlayerPreview,
  'standings': StandingsPreview,
  'complications': ComplicationsPreview,
};

function renderWidgets(layout, overlayData, scaleFactor, handleMouseDown, selectedId, dragging, dragPosRef, toggleWidgetVisibility) {
  const taskList = overlayData.tasks || [];
  const compList = overlayData.complications || [];
  const standList = overlayData.standings || [];
  return layout.map(widget => {
    const isDragged = dragging?.id === widget.id;
    const sx = isDragged ? dragPosRef.current.x * scaleFactor : widget.x * scaleFactor;
    const sy = isDragged ? dragPosRef.current.y * scaleFactor : widget.y * scaleFactor;
    const isSelected = widget.id === selectedId;
    const wScale = isDragged && dragPosRef.current.scale != null ? dragPosRef.current.scale : (widget.scale || 1);
    const { w, h } = getWidgetSize(widget.type, taskList, compList, standList);
    const isHidden = widget.visible === false;
    const isFluid = widget.type === 'tasks' || widget.type === 'score' || widget.type === 'complications' || widget.type === 'standings';

    // Effective scale: widget scale × canvas zoom — matches overlay 1:1
    const effScale = wScale * scaleFactor;

    // Font-size helper: base px → scaled px (1:1 with overlay)
    const fs = (basePx) => Math.max(4, Math.round(basePx * effScale)) + 'px';

    // Numeric scale helper for SVG attributes (no 'px' suffix)
    const ns = (baseN) => Math.max(2, Math.round(baseN * effScale));

    const Preview = PREVIEW_COMPONENTS[widget.type];

    return (
      <div
        key={widget.id}
        className={`layout-widget ${isSelected ? 'selected' : ''} ${dragging?.id === widget.id ? 'dragging' : ''} ${isHidden ? 'widget-hidden' : ''}`}
        style={{
          left: sx,
          top: sy,
          ...(isFluid
            ? { minWidth: w * effScale, minHeight: h * effScale }
            : { width: w * effScale, height: h * effScale }
          ),
          display: 'flex',
          alignItems: 'center',
          justifyContent: isFluid ? 'flex-start' : 'center',
          overflow: isFluid ? 'visible' : 'hidden',
          boxSizing: 'border-box',
          padding: `${Math.max(1, Math.round(3 * effScale))}px`,
        }}
        onMouseDown={(e) => handleMouseDown(e, widget)}
      >
        <button
          className={`widget-vis-toggle ${isHidden ? 'vis-hidden' : ''}`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); toggleWidgetVisibility(widget.id); }}
          title={isHidden ? 'Показать в оверлее' : 'Скрыть из оверлея'}
        >
          <span className="vis-eye">👁</span>
        </button>
        {Preview ? (
          <Preview data={overlayData} fs={fs} ns={ns} />
        ) : (
          <span className="layout-widget-label" style={{ fontSize: fs(12) }}>
            {WIDGET_LABELS[widget.type]}
          </span>
        )}
        <span className="layout-widget-pos" style={{ fontSize: fs(9) }}>
          {isDragged ? `${dragPosRef.current.x},${dragPosRef.current.y}` : `${widget.x},${widget.y}`}
        </span>
      </div>
    );
  });
}
