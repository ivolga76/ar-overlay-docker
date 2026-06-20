import { useTournament } from '../state/TournamentContext'
import { OVERLAY_WIDTH, OVERLAY_HEIGHT, getWidgetSize } from '../state/layoutDefaults'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { TimerWidget } from '../components/Timer'
import ErrorBoundary from '../components/ErrorBoundary'

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
            <span className="complication-num">{i + 1}</span>
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

  return (
    <div className="overlay-widget-inner">
      <div className="overlay-tasks-header">
        Задачи раунда ({completed}/{count})
      </div>
      <div className={gridClass}>
        {data.tasks.map((task, i) => (
          <div
            key={task.id}
            className={`overlay-task-tile ${task.completed ? 'completed' : ''}`}
          >
            <div className="task-number">{i + 1}</div>
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
  if (!data.showStandings || !data.standings?.length) return null
  return (
    <div className="overlay-widget-inner">
      <div className="overlay-tasks-header" style={{ marginBottom: 8 }}>
        Турнирная таблица
      </div>
      <div className="overlay-standings-list">
        {data.standings.map((p, i) => (
          <div key={p.id} className="overlay-standings-row">
            <span className="standings-pos">{i + 1}</span>
            <span className="standings-name">{p.name}</span>
            <span className="standings-score">{p.totalPoints ?? 0} очк.</span>
          </div>
        ))}
      </div>
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
}

export default function Overlay() {
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
        .filter(w => w.visible !== false)
        .map(widget => {
          const Widget = WIDGET_COMPONENTS[widget.type]
          if (!Widget) return null
          const s = widget.scale || 1
          const { w, h } = getWidgetSize(widget.type, tasks)

          const isFluid = widget.type === 'tasks' || widget.type === 'score' || widget.type === 'complications'

          return (
            <ErrorBoundary key={widget.id}>
              <div
                className="overlay-widget-slot"
                style={{
                  position: 'absolute',
                  left: widget.x,
                  top: widget.y,
                  width: isFluid ? 'auto' : w * s,
                  minWidth: isFluid ? w * s : undefined,
                  height: isFluid ? 'auto' : h * s,
                  minHeight: isFluid ? h * s : undefined,
                  overflow: isFluid ? 'visible' : 'hidden',
                }}
              >
                <div
                  style={{
                    transform: `scale(${s})`,
                    transformOrigin: 'top left',
                    width: w,
                    height: isFluid ? undefined : h,
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