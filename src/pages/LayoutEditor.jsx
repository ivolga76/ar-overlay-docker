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
  'standings': 'Таблица',
  'complications': 'Усложнения',
};

export default function LayoutEditor() {
  const { state, updateLayout, resetLayout, setFullLayout, toggleWidgetVisibility, standings } = useTournament();
  // Читаем только нужные поля — timerData игнорируется
  const layout = state.overlayLayout;
  const tasks = state.tasks;
  const complications = state.extensions?.complications || [];

  // Profile state
  const [profileNames, setProfileNames] = useState(() => getProfileNames());
  const [activeProfile, setActiveProfile] = useState(() => getActiveProfileName());
  const [profileInput, setProfileInput] = useState('');
  const [profileMsg, setProfileMsg] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const dragPosRef = useRef({ x: 0, y: 0 }); // локальная позиция во время драга
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

  // useMemo защищает пересчёт от timerData-ререндеров
  const scaleFactor = useMemo(() => Math.min(
    containerSize.w / OVERLAY_WIDTH,
    containerSize.h / OVERLAY_HEIGHT,
    1.0
  ), [containerSize.w, containerSize.h]);

  const toScreen = useCallback((x, y) => ({
    sx: x * scaleFactor,
    sy: y * scaleFactor,
  }), [scaleFactor]);

  const toLayout = useCallback((sx, sy) => ({
    x: Math.round(sx / scaleFactor),
    y: Math.round(sy / scaleFactor),
  }), [scaleFactor]);

  // Стабильный handleMouseDown
  const handleMouseDown = useCallback((e, widget) => {
    e.preventDefault();
    setSelectedId(widget.id);
    const containerRect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - containerRect.left - 16;
    const my = e.clientY - containerRect.top - 16;
    const sx = widget.x * scaleFactor;
    const sy = widget.y * scaleFactor;
    dragPosRef.current = { x: widget.x, y: widget.y };
    setDragging({
      id: widget.id,
      offsetX: mx - sx,
      offsetY: my - sy,
    });
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
      // Пишем только в ref — не дёргаем глобальный стейт и WebSocket
      dragPosRef.current = { x, y };
      // Форсируем ререндер только для visual feedback
      setDragging((prev) => prev ? { ...prev, _tick: Date.now() } : null);
    };

    const handleUp = () => {
      // Коммитим финальную позицию в глобальный стейт ОДИН раз
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
    updateLayout(selectedId, { scale: Math.round(newScale * 100) / 100 });
  }, [selectedId, layout, updateLayout]);

  const selectedWidget = useMemo(() =>
    layout.find(w => w.id === selectedId),
    [layout, selectedId]
  );

  // ★ Ключевой useMemo: виджеты не пересоздаются на тики таймера
  const widgets = useMemo(() =>
    renderWidgets(layout, tasks, complications, standings, scaleFactor, handleMouseDown, selectedId, dragging, dragPosRef, toggleWidgetVisibility),
    [layout, tasks, complications, standings, scaleFactor, handleMouseDown, selectedId, dragging, toggleWidgetVisibility]
  );

  // --- Profile handlers ---
  const refreshProfiles = useCallback(() => {
    setProfileNames(getProfileNames());
  }, []);

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
    if (activeProfile === name) {
      setActiveProfile('');
    }
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
          <input
            className="layout-profile-input"
            type="text"
            value={profileInput}
            onChange={(e) => setProfileInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
            placeholder="Имя профиля..."
          />
          <button className="admin-btn admin-btn-sm admin-btn-full" onClick={handleSaveProfile}>Сохранить</button>
          {activeProfile && (
            <button className="admin-btn admin-btn-sm admin-btn-danger admin-btn-full" onClick={() => handleDeleteProfile(activeProfile)}>Удалить профиль</button>
          )}
          {profileNames.length > 0 && (
            <div className="sidebar-profile-list">
              <div className="sidebar-divider" />
              <div className="sidebar-subtitle">Сохранённые:</div>
              {profileNames.map(name => (
                <div
                  key={name}
                  className={`sidebar-profile-item ${name === activeProfile ? 'active' : ''}`}
                  onClick={() => handleLoadProfile(name)}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
          <div className="sidebar-divider" />
          <button className="admin-btn admin-btn-sm admin-btn-full" onClick={handleResetLayout}>Сбросить расстановку</button>
        </div>

        <div
          ref={containerRef}
          className="layout-canvas-wrapper"
          onWheel={handleWheel}
        >
          <div
            className="layout-canvas"
            style={{
              width: OVERLAY_WIDTH * scaleFactor,
              height: OVERLAY_HEIGHT * scaleFactor,
            }}
          >
            <svg
              className="layout-grid"
              width={OVERLAY_WIDTH * scaleFactor}
              height={OVERLAY_HEIGHT * scaleFactor}
            >
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

function renderWidgets(layout, tasks, complications, standings, scaleFactor, handleMouseDown, selectedId, dragging, dragPosRef, toggleWidgetVisibility) {
  const taskList = tasks || [];
  const compList = complications || [];
  const standList = standings || [];
  return layout.map(widget => {
    const isDragged = dragging?.id === widget.id;
    const sx = isDragged ? dragPosRef.current.x * scaleFactor : widget.x * scaleFactor;
    const sy = isDragged ? dragPosRef.current.y * scaleFactor : widget.y * scaleFactor;
    const isSelected = widget.id === selectedId;
    const s = widget.scale || 1;
    const { w, h } = getWidgetSize(widget.type, taskList, compList, standList);
    const isHidden = widget.visible === false;

    return (
      <div
        key={widget.id}
        className={`layout-widget ${isSelected ? 'selected' : ''} ${dragging?.id === widget.id ? 'dragging' : ''} ${isHidden ? 'widget-hidden' : ''}`}
        style={{
          left: sx,
          top: sy,
          width: w * s,
          height: h * s,
        }}
        onMouseDown={(e) => handleMouseDown(e, widget)}
      >
        <button
          className={`widget-vis-toggle ${isHidden ? 'vis-hidden' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleWidgetVisibility(widget.id); }}
          title={isHidden ? 'Показать в оверлее' : 'Скрыть из оверлея'}
        >
          <span className="vis-eye">👁</span>
        </button>
        {widget.type === 'tasks' ? (
          <div className="layout-tasks-preview" style={{ transform: `scale(${s})`, transformOrigin: 'top left', width: w, padding: '4px 8px' }}>
            <div style={{ color: 'var(--cyan)', fontSize: '10px', marginBottom: '4px' }}>
              Задачи ({taskList.filter(t => t.completed).length}/{taskList.length})
            </div>
            {taskList.map((task, i) => (
              <div key={task.id} style={{ display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: '4px', fontSize: '9px', color: '#ccc', marginBottom: '2px', lineHeight: 1.3, minHeight: '2.6em' }}>
                <span style={{ color: 'var(--cyan)', textAlign: 'center' }}>{i + 1}</span>
                <span style={{ wordBreak: 'break-word' }}>{task.text}</span>
                <span style={{ color: 'var(--orange)' }}>{task.points} очк.</span>
              </div>
            ))}
          </div>
        ) : widget.type === 'complications' ? (
          <div className="layout-tasks-preview" style={{ transform: `scale(${s})`, transformOrigin: 'top left', width: w, padding: '4px 8px' }}>
            <div style={{ color: 'var(--orange)', fontSize: '10px', marginBottom: '4px' }}>
              Усложнения ({compList.length})
            </div>
            {compList.map((comp, i) => (
              <div key={comp.id} style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: '4px', fontSize: '9px', color: '#ccc', marginBottom: '2px', lineHeight: 1.3, minHeight: '2em' }}>
                <span style={{ color: 'var(--orange)', textAlign: 'center' }}>{i + 1}</span>
                <span style={{ wordBreak: 'break-word' }}>{comp.text}</span>
              </div>
            ))}
            {compList.length === 0 && <div style={{ fontSize: '9px', color: 'var(--muted)' }}>Нет активных усложнений</div>}
          </div>
        ) : (
          <span className="layout-widget-label" style={{ transform: `scale(${s})`, transformOrigin: 'top left' }}>
            {WIDGET_LABELS[widget.type]}
          </span>
        )}
        <span className="layout-widget-pos">
          {isDragged ? `${dragPosRef.current.x},${dragPosRef.current.y}` : `${widget.x},${widget.y}`}
        </span>
      </div>
    );
  });
}