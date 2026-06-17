import { useState, useRef, useCallback, useEffect } from 'react';
import { useTournament } from '../state/TournamentContext';
import { WIDGET_TYPES, OVERLAY_WIDTH, OVERLAY_HEIGHT, createDefaultLayout, getWidgetSize } from '../state/layoutDefaults';

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
  const { state, updateLayout, resetLayout } = useTournament();
  const layout = state.overlayLayout;

  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(null); // { id, offsetX, offsetY }
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: 960, h: 540 });

  // Measure container on mount and resize
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

  const scaleFactor = Math.min(
    containerSize.w / OVERLAY_WIDTH,
    containerSize.h / OVERLAY_HEIGHT,
    1.0
  );

  const toScreen = useCallback((x, y) => ({
    sx: x * scaleFactor,
    sy: y * scaleFactor,
  }), [scaleFactor]);

  const toLayout = useCallback((sx, sy) => ({
    x: Math.round(sx / scaleFactor),
    y: Math.round(sy / scaleFactor),
  }), [scaleFactor]);

  // --- Drag handling ---
  const handleMouseDown = (e, widget) => {
    e.preventDefault();
    setSelectedId(widget.id);
    const containerRect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - containerRect.left - 16; // 16px padding
    const my = e.clientY - containerRect.top - 16;
    const { sx, sy } = toScreen(widget.x, widget.y);
    setDragging({
      id: widget.id,
      offsetX: mx - sx,
      offsetY: my - sy,
    });
  };

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
      updateLayout(dragging.id, { x, y });
    };

    const handleUp = () => setDragging(null);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, scaleFactor, toLayout, updateLayout]);

  // --- Wheel -> scale ---
  const handleWheel = useCallback((e) => {
    if (!selectedId) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const widget = layout.find(w => w.id === selectedId);
    if (!widget) return;
    const newScale = Math.max(0.3, Math.min(3.0, (widget.scale || 1) + delta));
    updateLayout(selectedId, { scale: Math.round(newScale * 100) / 100 });
  }, [selectedId, layout, updateLayout]);

  const selectedWidget = layout.find(w => w.id === selectedId);

  return (
    <div className="layout-editor">
      <div className="layout-toolbar">
        <span className="layout-info">
          Поле {OVERLAY_WIDTH}×{OVERLAY_HEIGHT}
          {selectedWidget && ` | ${WIDGET_LABELS[selectedWidget.type]}: scale ${selectedWidget.scale || 1}`}
        </span>
        <button className="admin-btn admin-btn-sm" onClick={resetLayout}>
          Сбросить расстановку
        </button>
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
          {/* Grid */}
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
            {/* Center crosshair */}
            <line x1={OVERLAY_WIDTH / 2 * scaleFactor} y1="0" x2={OVERLAY_WIDTH / 2 * scaleFactor} y2={OVERLAY_HEIGHT * scaleFactor} stroke="rgba(114,217,255,0.15)" strokeWidth="1" />
            <line x1="0" y1={OVERLAY_HEIGHT / 2 * scaleFactor} x2={OVERLAY_WIDTH * scaleFactor} y2={OVERLAY_HEIGHT / 2 * scaleFactor} stroke="rgba(114,217,255,0.15)" strokeWidth="1" />
          </svg>

          {/* Widgets */}
          {renderWidgets(layout, state.tasks, toScreen, handleMouseDown, selectedId, dragging)}
        </div>
      </div>
    </div>
  );
}

function renderWidgets(layout, tasks, toScreen, handleMouseDown, selectedId, dragging) {
  const taskList = tasks || [];
  return layout.filter(w => w.visible !== false).map(widget => {
    const { sx, sy } = toScreen(widget.x, widget.y);
    const isSelected = widget.id === selectedId;
    const s = widget.scale || 1;
    const { w, h } = getWidgetSize(widget.type, taskList);

    return (
      <div
        key={widget.id}
        className={`layout-widget ${isSelected ? 'selected' : ''} ${dragging?.id === widget.id ? 'dragging' : ''}`}
        style={{
          left: sx,
          top: sy,
          width: w * s,
          height: h * s,
        }}
        onMouseDown={(e) => handleMouseDown(e, widget)}
      >
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
        ) : (
          <span className="layout-widget-label" style={{ transform: `scale(${s})`, transformOrigin: 'top left' }}>
            {WIDGET_LABELS[widget.type]}
          </span>
        )}
        <span className="layout-widget-pos">
          {widget.x},{widget.y}
        </span>
      </div>
    );
  });
}
