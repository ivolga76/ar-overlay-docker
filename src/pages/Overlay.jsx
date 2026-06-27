import { useTournament } from '../state/TournamentContext'
import { OVERLAY_WIDTH, OVERLAY_HEIGHT, getWidgetSize } from '../state/layoutDefaults'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { TimerWidget } from '../components/Timer'
import ErrorBoundary from '../components/ErrorBoundary'
import { getStoredSeasonId } from '../pages/Settings.jsx'

const TournamentName = memo(function TournamentName({ data }) {
  return (
    <div className="overlay-widget-inner">
      <div className="overlay-title">{data.tournamentName || 'Битва за Респект'}</div>
    </div>
  )
})

const Round = memo(function Round({ data }) {
  return (
    <div className="overlay-widget-inner">
      <div className="overlay-round">Раунд {data.currentRound} из {data.totalRounds}</div>
    </div>
  )
})

const ScoreWidget = memo(function ScoreWidget({ data }) {
  const prevPoints = useRef(data.points)
  const [animClass, setAnimClass] = useState('')

  useEffect(() => {
    const prev = prevPoints.current
    if (data.points !== prev) {
      const dir = data.points > prev ? 'up' : 'down'
      setAnimClass(`score-pop score-${dir}`)
      prevPoints.current = data.points
      const timer = setTimeout(() => setAnimClass(''), 500)
      return () => clearTimeout(timer)
    }
  }, [data.points])

  return (
    <div className="overlay-widget-inner">
      <div className="overlay-score-row">
        <span className="overlay-player">{data.name || '---'}</span>
        <span className={`overlay-score ${animClass}`}>{data.points ?? 0} очк.</span>
      </div>
    </div>
  )
})

const Complications = memo(function Complications({ data }) {
  const comps = data.complications || []
  if (!comps.length) return null
  return (
    <div className="overlay-widget-inner">
      <div className="overlay-tasks-header">
        Усложнения раунда ({comps.length})
      </div>
      <div className="overlay-complications-list">
        {comps.map((comp, i) => (
          <div key={comp.id} className="overlay-complication-item">
            <span className="complication-text">{comp.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

const Tasks = memo(function Tasks({ data }) {
  const count = data.tasks.length
  const completed = data.tasks.filter(t => t.completed).length
  const gridClass = count <= 3 ? `overlay-tasks-grid tasks-row-${count}` : 'overlay-tasks-grid tasks-multi'
  const isSeason2 = getStoredSeasonId() === 'season-2';
  const label = isSeason2 ? 'Контракты' : 'Задачи раунда';

  return (
    <div className="overlay-widget-inner">
      <div className="overlay-tasks-header">
        {label} ({completed}/{count})
      </div>
      <div className={gridClass}>
        {data.tasks.map((task, i) => (
          <div
            key={task.id}
            className={`overlay-task-tile ${task.completed ? 'completed' : ''}`}
          >
            <div className="task-name">{task.text}</div>
            <div className="task-cost">{task.points} очк.</div>
          </div>
        ))}
      </div>
    </div>
  )
})

const PreviousPlayer = memo(function PreviousPlayer({ data }) {
  if (!data.previousPlayer) return null
  return (
    <div className="overlay-widget-inner">
      <div className="overlay-tasks-header" style={{ fontSize: 14, marginBottom: 4 }}>
        Предыдущий игрок
      </div>
      <div className="overlay-player" style={{ fontSize: 18 }}>
        {data.previousPlayer.name}
      </div>
      <div className="overlay-score" style={{ fontSize: 16, opacity: 0.7 }}>
        {data.previousPlayer.totalPoints ?? 0} очк.
      </div>
    </div>
  )
})

const Standings = memo(function Standings({ data }) {
  if (!data.standings?.length) return null
  const list = data.standings
  // Pair up participants for versus display
  const pairs = []
  for (let i = 0; i < list.length; i += 2) {
    pairs.push({
      left: list[i],
      right: list[i + 1] || null,
    })
  }
  return (
    <div className="overlay-widget-inner">
      <div className="vs-scoreboard">
        {pairs.map((pair, i) => (
          <div key={pair.left.id} className="vs-row">
            <div className="vs-team vs-team-left">
              <span className="vs-name">{pair.left.name}</span>
              {pair.left.players?.length > 0 && (
                <span className="vs-players">{pair.left.players.map(p => p.name).join(' / ')}</span>
              )}
            </div>
            <div className="vs-score-block">
              <span className="vs-score vs-score-left">{pair.left.totalPoints ?? 0}</span>
              <span className="vs-colon">:</span>
              <span className="vs-score vs-score-right">{pair.right ? pair.right.totalPoints ?? 0 : 0}</span>
            </div>
            <div className="vs-team vs-team-right">
              {pair.right && <>
                <span className="vs-name">{pair.right.name}</span>
                {pair.right.players?.length > 0 && (
                  <span className="vs-players">{pair.right.players.map(p => p.name).join(' / ')}</span>
                )}
              </>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

const Roulette = memo(function Roulette({ data }) {
  const [animAngle, setAnimAngle] = useState(0)
  const rd = data.rouletteData
  const items = rd?.items || data.tasks || []
  const sectorAngle = items.length > 0 ? 360 / items.length : 60
  const dim = 340
  const r = dim / 2 - 10
  const cx = dim / 2
  const cy = dim / 2
  const arrowX = dim + 14
  const arrowY = cy
  const colors = ['#ff4d6a', '#ffb347', '#4ecdc4', '#7b68ee', '#ff6b9d', '#c9a0dc', '#48c9b0', '#f4d03f']

  useEffect(() => {
    if (rd?.spinning && rd.targetAngle != null) {
      // Start from 0, animate to targetAngle
      requestAnimationFrame(() => setAnimAngle(rd.targetAngle))
    }
  }, [rd?.spinning, rd?.targetAngle])

  const sectors = items.map((item, i) => {
    const startAngle = i * sectorAngle
    const endAngle = (i + 1) * sectorAngle
    const startRad = (startAngle - 90) * Math.PI / 180
    const endRad = (endAngle - 90) * Math.PI / 180
    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)
    const largeArc = sectorAngle > 180 ? 1 : 0
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
    const midAngle = (startAngle + endAngle) / 2 - 90
    const midRad = midAngle * Math.PI / 180
    const tx = cx + r * 0.6 * Math.cos(midRad)
    const ty = cy + r * 0.6 * Math.sin(midRad)
    return { d, color: colors[i % colors.length], tx, ty, text: item.text }
  })

  if (!items.length) {
    return (
      <div className="overlay-widget-inner">
        <div className="overlay-tasks-header">Рулетка</div>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Нет задач для розыгрыша</div>
      </div>
    )
  }

  return (
    <div className="overlay-widget-inner" style={{ display: 'flex', alignItems: 'center' }}>
      <svg width={dim + 30} height={dim} viewBox={`0 0 ${dim + 30} ${dim}`}>
        <g transform={`rotate(${animAngle}, ${cx}, ${cy})`}
          style={{ transition: animAngle > 0 ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}>
          {sectors.map((s, i) => (
            <g key={i}>
              <path d={s.d} fill={s.color} stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
              <text x={s.tx} y={s.ty} textAnchor="middle" dominantBaseline="central"
                fill="#fff" fontSize="9" fontWeight="600"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
                {s.text.length > 14 ? s.text.slice(0, 12) + '\u2026' : s.text}
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
  )
})

const WIDGET_COMPONENTS = {
  'tournament-name': TournamentName,
  'round': Round,
  'score': ScoreWidget,
  'tasks': Tasks,
  'timer': TimerWidget,
  'previous-player': PreviousPlayer,
  'standings': Standings,
  'complications': Complications,
  'roulette': Roulette,
}

export default function Overlay({ userId }) {
  const { state, currentParticipant, previousParticipant, standings } = useTournament()
  const containerRef = useRef(null)
  const [viewScale, setViewScale] = useState(1)

  useEffect(() => {
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setViewScale(Math.min(w / OVERLAY_WIDTH, h / OVERLAY_HEIGHT));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const layout = state.overlayLayout || []
  const tasks = state.tasks || []

  // useMemo без timerData — виджеты не перерендерятся на каждый тик таймера
  const data = useMemo(() => ({
    tournamentName: state.tournamentName,
    currentRound: state.currentRound,
    totalRounds: state.totalRounds,
    name: currentParticipant?.name,
    points: currentParticipant?.totalPoints ?? 0,
    tasks,
    previousPlayer: previousParticipant,
    showStandings: state.showStandings,
    standings,
    complications: state.extensions?.complications || [],
    rouletteData: state.rouletteData,
  }), [
    state.tournamentName,
    state.currentRound,
    state.totalRounds,
    currentParticipant,
    tasks,
    previousParticipant,
    state.showStandings,
    standings,
    state.extensions?.complications,
    state.rouletteData,
  ])

  return (
    <div
      className="overlay"
      ref={containerRef}
      style={{
        width: OVERLAY_WIDTH,
        height: OVERLAY_HEIGHT,
        transform: `scale(${viewScale})`,
      }}
    >
      {layout
        .map(widget => {
          const Widget = WIDGET_COMPONENTS[widget.type]
          if (!Widget) return null
          const isHidden = widget.visible === false
          const s = widget.scale || 1
          let { w, h } = getWidgetSize(widget.type, tasks, data.complications, data.standings)

          // Custom width from resize
          if (widget.customWidth != null) {
            w = widget.customWidth
          }

          // Timer and Roulette are fixed size (SVG)
          const isFixedSize = widget.type === 'timer' || widget.type === 'roulette'

          return (
            <ErrorBoundary key={widget.id}>
              <div
                className={`overlay-widget-slot ${isHidden ? 'overlay-widget-hidden' : ''}`}
                style={{
                  position: 'absolute',
                  left: widget.x,
                  top: widget.y,
                  width: isFixedSize ? w * s : 'auto',
                  minWidth: isFixedSize ? undefined : w * s,
                  height: isFixedSize ? h * s : 'auto',
                  minHeight: isFixedSize ? undefined : h * s,
                  overflow: 'visible',
                  padding: widget.type === 'standings' ? `0 ${Math.round(w * s * 0.10)}px` : undefined,
                }}
              >
                <div
                  style={{
                    transform: `scale(${s})`,
                    transformOrigin: 'top left',
                    width: w,
                    height: isFixedSize ? h : undefined,
                  }}
                >
                  <Widget data={data} />
                </div>
              </div>
            </ErrorBoundary>
          )
        })}
    </div>
  )
}