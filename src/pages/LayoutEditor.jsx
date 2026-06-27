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
  'roulette': 'Рулетка',
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

  // ── Drag state: boolean (for CSS) + refs (metadata) + tick (for position updates) ──
  const [isDragging, setIsDragging] = useState(false);
  const dragMetaRef = useRef(null);    // { offsetX, offsetY }
  const dragPosRef = useRef({ x: 0, y: 0, scale: null });
  const [dragTick, setDragTick] = useState(0);

  // ── Resize state: same pattern ──
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef({ id: null, edge: null, startX: 0, startWidth: 0, startWidgetX: 0, w: 0, widgetX: 0, onReset: null, _scale: null });
  const [resizeTick, setResizeTick] = useState(0);

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

  // ── Mouse down: start drag ────────────────────────────────────────
  const handleMouseDown = useCallback((e, widget) => {
    e.preventDefault();
    setSelectedId(widget.id);
    const containerRect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - containerRect.left - 16;
    const my = e.clientY - containerRect.top - 16;
    const sx = widget.x * scaleFactor;
    const sy = widget.y * scaleFactor;
    dragPosRef.current = { x: widget.x, y: widget.y, scale: null };
    dragMetaRef.current = { offsetX: mx - sx, offsetY: my - sy };
    setIsDragging(true);
  }, [scaleFactor]);

  // ── Drag effect: stable — depends on boolean, not state object ────
  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e) => {
      const containerRect = containerRef.current.getBoundingClientRect();
      const mx = e.clientX - containerRect.left - 16;
      const my = e.clientY - containerRect.top - 16;
      const meta = dragMetaRef.current;
      if (!meta) return;
      const newSx = mx - meta.offsetX;
      const newSy = my - meta.offsetY;
      const { x, y } = toLayout(
        Math.max(0, Math.min(newSx, OVERLAY_WIDTH * scaleFactor - 100)),
        Math.max(0, Math.min(newSy, OVERLAY_HEIGHT * scaleFactor - 30)),
      );
      dragPosRef.current = { ...dragPosRef.current, x, y };
      setDragTick(t => t + 1);
    };
    const handleUp = () => {
      const dragId = dragMetaRef.current ? selectedId : null;
      if (dragId) {
        const pos = dragPosRef.current;
        const patch = { x: pos.x, y: pos.y };
        if (pos.scale != null) patch.scale = pos.scale;
        updateLayout(dragId, patch);
      }
      setIsDragging(false);
      dragMetaRef.current = null;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, scaleFactor, toLayout, updateLayout, selectedId]);

  // ── Resize handlers ────────────────────────────────────────────────

  const handleResizeMouseDown = useCallback((e, widget, edge) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(widget.id);
    const baseW = widget.customWidth ?? getWidgetSize(widget.type, tasks, complications, standings).w;
    resizeRef.current = {
      id: widget.id,
      edge,
      startX: e.clientX,
      startWidth: baseW,
      startWidgetX: widget.x,
      w: baseW,
      widgetX: widget.x,
      onReset: (id) => updateLayout(id, { customWidth: null }),
      _scale: null,
    };
    setIsResizing(true);
  }, [tasks, complications, standings, updateLayout]);

  // ── Resize effect: stable — depends on boolean, not state object ──
  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e) => {
      const deltaX = e.clientX - resizeRef.current.startX;
      let newWidth, newX;
      if (resizeRef.current.edge === 'left') {
        newWidth = resizeRef.current.startWidth - deltaX;
        newX = resizeRef.current.startWidgetX + deltaX;
        newWidth = Math.max(MIN_WIDGET_WIDTH, newWidth);
        const maxX = resizeRef.current.startWidgetX + resizeRef.current.startWidth - MIN_WIDGET_WIDTH;
        newX = Math.max(0, Math.min(newX, maxX));
        newWidth = resizeRef.current.startWidgetX + resizeRef.current.startWidth - newX;
      } else {
        newWidth = resizeRef.current.startWidth + deltaX;
        newX = resizeRef.current.startWidgetX;
        newWidth = Math.max(MIN_WIDGET_WIDTH, Math.min(newWidth, OVERLAY_WIDTH - newX));
      }
      resizeRef.current.w = Math.round(newWidth);
      resizeRef.current.widgetX = Math.round(newX);
      setResizeTick(t => t + 1);
    };
    const handleUp = () => {
      const finalW = resizeRef.current.w;
      const finalX = resizeRef.current.widgetX;
      const rid = resizeRef.current.id;
      const widget = layout.find(w => w.id === rid);
      const defW = widget ? getWidgetSize(widget.type, tasks, complications, standings).w : 80;
      const patch = {};
      if (Math.abs(finalW - defW) > 2) {
        patch.customWidth = finalW;
      } else {
        patch.customWidth = null;
      }
      if (resizeRef.current.edge === 'left' && finalX !== resizeRef.current.startWidgetX) {
        patch.x = finalX;
      }
      if (resizeRef.current._scale != null) {
        patch.scale = Math.round(resizeRef.current._scale * 100) / 100;
      }
      if (rid) updateLayout(rid, patch);
      setIsResizing(false);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizing, tasks, complications, standings, updateLayout, layout]);

  // ── Wheel handler (ref-based, stable listener) ────────────────────
  const wheelStateRef = useRef({ selectedId: null, layout: null, updateLayout: null, isDragging: false, isResizing: false });
  wheelStateRef.current.selectedId = selectedId;
  wheelStateRef.current.layout = layout;
  wheelStateRef.current.updateLayout = updateLayout;
  wheelStateRef.current.isDragging = isDragging;
  wheelStateRef.current.isResizing = isResizing;

  const handleWheel = useCallback((e) => {
    const { selectedId: sid, layout: lay, updateLayout: upd, isDragging: drg, isResizing: rsg } = wheelStateRef.current;
    if (!sid) return;
    e.preventDefault();
    const widget = lay.find(w => w.id === sid);
    if (!widget) return;
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newScale = Math.max(0.3, Math.min(3.0, (widget.scale || 1) + delta));
    const rounded = Math.round(newScale * 100) / 100;
    if (rsg) {
      resizeRef.current._scale = rounded;
      setResizeTick(t => t + 1);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        upd(sid, { scale: rounded });
        wheelTimerRef.current = null;
      }, 200);
      return;
    }
    if (!drg) {
      dragPosRef.current = { x: widget.x, y: widget.y, scale: rounded };
    } else {
      dragPosRef.current = { ...dragPosRef.current, scale: rounded };
    }
    setDragTick(t => t + 1);
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = setTimeout(() => {
      upd(sid, { scale: rounded });
      wheelTimerRef.current = null;
    }, 200);
  }, []);

  // Stable wheel listener on window
  useEffect(() => {
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

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

  const handleResetWidth = useCallback((id) => {
    updateLayout(id, { customWidth: null });
  }, [updateLayout]);

  // ── Widgets: pre-compute positions, pass as simple props to memo'd WidgetItem ──
  const widgets = useMemo(() => {
    const taskList = overlayData.tasks || [];
    const compList = overlayData.complications || [];
    const standList = overlayData.standings || [];
    return layout.map(widget => {
      // Determine if this widget is being dragged/resized
      const dragged = isDragging && dragMetaRef.current != null;
      const resizing = isResizing && resizeRef.current.id === widget.id;

      // Position during drag: use dragPosRef, else widget position
      const sx = (dragged ? dragPosRef.current.x : widget.x) * scaleFactor;
      const sy = (dragged ? dragPosRef.current.y : widget.y) * scaleFactor;
      const wScale = (dragged && dragPosRef.current.scale != null)
        ? dragPosRef.current.scale
        : (widget.scale || 1);

      // Size: during resize, use resizeRef; else compute from widget type
      let { w, h } = getWidgetSize(widget.type, taskList, compList, standList);
      if (widget.customWidth != null) w = widget.customWidth;

      // Standings auto-width (only if no custom width)
      if (widget.type === 'standings' && widget.customWidth == null) {
        const maxNameLen = Math.max(...standList.map(p => (p.name || '').length), 0);
        w = Math.max(180, maxNameLen * 12 + 120);
      }

      const displayW = resizing ? resizeRef.current.w : w;
      const displayX = resizing ? resizeRef.current.widgetX : widget.x;

      const isSelected = widget.id === selectedId;

      return (
        <WidgetItem
          key={widget.id}
          widget={widget}
          overlayData={overlayData}
          scaleFactor={scaleFactor}
          effScale={wScale * scaleFactor}
          sx={sx}
          sy={sy}
          displayW={displayW}
          displayX={displayX}
          displayH={h}
          isSelected={isSelected}
          isDragging={dragged}
          isResizing={resizing}
          onMouseDown={handleMouseDown}
          toggleVisibility={toggleWidgetVisibility}
          onResizeMouseDown={handleResizeMouseDown}
          onResetWidth={handleResetWidth}
        />
      );
    });
  }, [layout, overlayData, scaleFactor, selectedId, isDragging, isResizing, dragTick, resizeTick, handleMouseDown, toggleWidgetVisibility, handleResizeMouseDown, handleResetWidth]);

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
        <div ref={containerRef} className="layout-canvas-wrapper">
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

// ═══════════════════════════════════════════════════════════════════
// ── Preview components — render at scaled size directly (no CSS transform) ────

const OV = {
  title: 24, round: 18, player: 32, score: 38,
  tasksHeader: 16, taskName: 14, taskCost: 12, taskPadding: 8,
  taskGap: 8, taskRadius: 8, compHeader: 16, compText: 13,
  compGap: 8, compListGap: 4, vsHeader: 16, vsName: 16,
  vsScore: 14, vsTeamMinW: 80, vsRowPad: 6, prevHeader: 16,
  prevName: 18, prevScore: 16, timerRing: 170, timerStroke: 10,
  timerText: 48,
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
      <div className="vs-scoreboard" style={{ gap: fs(2) }}>
        {pairs.map((pair) => (
          <div key={pair.left.id} className="vs-row" style={{ padding: `${fs(OV.vsRowPad / 2)} 0`, animation: 'none' }}>
            <div className="vs-team vs-team-left" style={{ minWidth: fs(OV.vsTeamMinW) }}>
              <span className="vs-name" style={{ fontSize: fs(OV.vsName) }}>{pair.left.name}</span>
              {pair.left.players?.length > 0 && (
                <span className="vs-players" style={{ fontSize: fs(OV.vsScore - 2) }}>{pair.left.players.map(p => p.name).join(' / ')}</span>
              )}
            </div>
            <div className="vs-score-block">
              <span className="vs-score vs-score-left" style={{ fontSize: fs(OV.vsScore) }}>{pair.left.totalPoints ?? 0}</span>
              <span className="vs-colon" style={{ fontSize: fs(OV.vsScore) }}>:</span>
              <span className="vs-score vs-score-right" style={{ fontSize: fs(OV.vsScore) }}>{pair.right ? pair.right.totalPoints ?? 0 : 0}</span>
            </div>
            <div className="vs-team vs-team-right" style={{ minWidth: fs(OV.vsTeamMinW) }}>
              {pair.right && <>
                <span className="vs-name" style={{ fontSize: fs(OV.vsName) }}>{pair.right.name}</span>
                {pair.right.players?.length > 0 && (
                  <span className="vs-players" style={{ fontSize: fs(OV.vsScore - 2) }}>{pair.right.players.map(p => p.name).join(' / ')}</span>
                )}
              </>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoulettePreview({ data, fs, ns }) {
  const { state: st } = useTournament();
  const rd = st.rouletteData;
  const items = rd?.items || data.tasks || [];
  const sectorAngle = items.length > 0 ? 360 / items.length : 60;
  const dim = 340;
  const r = dim / 2 - 10;
  const cx = dim / 2;
  const cy = dim / 2;
  const arrowX = dim + 4;
  const arrowY = cy;
  const colors = ['#ff4d6a', '#ffb347', '#4ecdc4', '#7b68ee', '#ff6b9d', '#c9a0dc', '#48c9b0', '#f4d03f'];

  const sectors = items.map((item, i) => {
    const startAngle = i * sectorAngle;
    const endAngle = (i + 1) * sectorAngle;
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = sectorAngle > 180 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    const midAngle = (startAngle + endAngle) / 2 - 90;
    const midRad = midAngle * Math.PI / 180;
    const tx = cx + r * 0.6 * Math.cos(midRad);
    const ty = cy + r * 0.6 * Math.sin(midRad);
    return { d, color: colors[i % colors.length], tx, ty, text: item.text };
  });

  const angle = rd?.spinning ? rd.targetAngle : 0;

  return (
    <div className="overlay-widget-inner" style={{ display: 'flex', alignItems: 'center' }}>
      <svg width={dim + 30} height={dim} viewBox={`0 0 ${dim + 30} ${dim}`}>
        <g transform={`rotate(${angle}, ${cx}, ${cy})`} style={{ transition: 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' }}>
          {sectors.map((s, i) => (
            <g key={i}>
              <path d={s.d} fill={s.color} stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
              <text x={s.tx} y={s.ty} textAnchor="middle" dominantBaseline="central"
                fill="#fff" fontSize={fs ? fs(9) : 9} fontWeight="600"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
                {s.text.length > 14 ? s.text.slice(0, 12) + '…' : s.text}
              </text>
            </g>
          ))}
          <circle cx={cx} cy={cy} r={r * 0.12} fill="#1a1a2e" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
        </g>
        <polygon
          points={`${arrowX - 16},${arrowY - 10} ${arrowX},${arrowY} ${arrowX - 16},${arrowY + 10}`}
          fill="var(--cyan)"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1"
        />
      </svg>
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
  'roulette': RoulettePreview,
};

const MIN_WIDGET_WIDTH = 60;

// ═══════════════════════════════════════════════════════════════════
// ── Memo'd WidgetItem — only re-renders when its visual props change ──

const WidgetItem = memo(function WidgetItem({
  widget,
  overlayData,
  scaleFactor,
  effScale,
  sx, sy, displayW, displayX, displayH,
  isSelected,
  isDragging,
  isResizing,
  onMouseDown,
  toggleVisibility,
  onResizeMouseDown,
  onResetWidth,
}) {
  const taskList = overlayData.tasks || [];
  const compList = overlayData.complications || [];
  const standList = overlayData.standings || [];

  const isHidden = widget.visible === false;
  const isFluid = widget.type === 'score';
  const isStandings = widget.type === 'standings';
  const isFixedPad = widget.type === 'tasks' || widget.type === 'complications';
  const isFixedSize = widget.type === 'timer' || widget.type === 'roulette';

  const handleW = Math.max(4, Math.round(6 * scaleFactor));

  // Font-size helper
  const fs = (basePx) => Math.max(4, Math.round(basePx * effScale)) + 'px';
  // Numeric scale helper for SVG
  const ns = (baseN) => Math.max(2, Math.round(baseN * effScale));

  const Preview = PREVIEW_COMPONENTS[widget.type];

  // Position label
  let posLabel;
  if (isResizing) {
    posLabel = `${displayX},${widget.y} w=${displayW}`;
  } else if (isDragging) {
    posLabel = `${Math.round(sx / scaleFactor)},${Math.round(sy / scaleFactor)}`;
  } else {
    posLabel = `${widget.x},${widget.y}`;
  }

  return (
    <div
      className={`layout-widget ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''} ${isHidden ? 'widget-hidden' : ''}`}
      style={{
        left: isResizing ? displayX * scaleFactor : sx,
        top: sy,
        ...(isFixedSize
          ? { width: displayW * effScale, height: displayH * effScale }
          : isStandings
            ? { width: 'auto', minWidth: displayW * effScale, minHeight: displayH * effScale }
            : isFluid
              ? { minWidth: displayW * effScale, minHeight: displayH * effScale }
              : isFixedPad
                ? { width: displayW * effScale * 1.3, minHeight: displayH * effScale }
                : { width: displayW * effScale, minHeight: displayH * effScale }
        ),
        height: isFixedSize ? undefined : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: isFixedSize ? 'hidden' : 'visible',
        boxSizing: 'border-box',
        padding: isStandings
          ? `${Math.max(1, Math.round(4 * effScale))}px ${Math.round(0.10 * displayW * effScale)}px`
          : isFixedPad
            ? `${Math.max(1, Math.round(4 * effScale))}px ${Math.round(0.15 * displayW * effScale)}px`
            : `${Math.max(1, Math.round(3 * effScale))}px`,
        cursor: isDragging ? 'grabbing' : (isSelected ? 'grab' : undefined),
      }}
      onMouseDown={(e) => onMouseDown(e, widget)}
    >
      {/* Left resize handle */}
      <div
        className="layout-resize-handle layout-resize-left"
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: handleW, cursor: 'ew-resize', zIndex: 5,
        }}
        onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(e, widget, 'left'); }}
        onDoubleClick={(e) => { e.stopPropagation(); onResetWidth(widget.id); }}
      />
      {/* Right resize handle */}
      <div
        className="layout-resize-handle layout-resize-right"
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: handleW, cursor: 'ew-resize', zIndex: 5,
        }}
        onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(e, widget, 'right'); }}
        onDoubleClick={(e) => { e.stopPropagation(); onResetWidth(widget.id); }}
      />
      <button
        className={`widget-vis-toggle ${isHidden ? 'vis-hidden' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); toggleVisibility(widget.id); }}
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
        {posLabel}
      </span>
    </div>
  );
});
