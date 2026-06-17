import { useState, useRef, useEffect } from 'react';
import { useTournament } from '../state/TournamentContext.jsx';

const PRESETS = [
  { label: '30', unit: 'с', ms: 30000 },
  { label: '1',  unit: 'мин', ms: 60000 },
  { label: '2',  unit: 'мин', ms: 120000 },
  { label: '3',  unit: 'мин', ms: 180000 },
];

export function fmt(ms) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
}

const R=85, SW2=10, V2=(R+SW2)*2, C2=V2/2, LEN2=2*Math.PI*R;

export function Ring({ progress, totalMs, remainingMs }) {
  const off = LEN2*(1-Math.min(1,Math.max(0,progress)));
  const hue = totalMs ? (remainingMs/totalMs)*120 : 120;
  return (
    <svg className="timer-ring" width={V2} height={V2} viewBox={`0 0 ${V2} ${V2}`}>
      <circle cx={C2} cy={C2} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW2}/>
      <circle cx={C2} cy={C2} r={R} fill="none" stroke={`hsl(${hue},85%,55%)`}
        strokeWidth={SW2} strokeLinecap="round" strokeDasharray={LEN2} strokeDashoffset={off}
        transform={`rotate(-90 ${C2} ${C2})`}
        style={{transition:'stroke-dashoffset 0.3s linear,stroke 0.5s'}}/>
    </svg>
  );
}

export default function Timer() {
  const { setTimerData } = useTournament();

  const [phase, setPhase] = useState('idle');
  const [display, setDisplay] = useState('00:00');
  const [totalMs, setTotalMs] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);

  const stateRef = useRef({ phase: 'idle' });

  function teardown() {
    const s = stateRef.current;
    if (s.raf) { cancelAnimationFrame(s.raf); s.raf = null; }
    if (s.sync) { clearInterval(s.sync); s.sync = null; }
  }

  function startMs(ms) {
    teardown();
    const until = Date.now() + ms;
    const s = stateRef.current;
    s.until = until;
    s.total = ms;
    setTotalMs(ms);
    setRemainingMs(ms);
    setDisplay(fmt(ms));
    setPhase('running');
    s.phase = 'running';
    setTimerData({ remainingMs: ms, totalMs: ms, running: true, paused: false });

    function tick() {
      const rem = Math.max(0, s.until - Date.now());
      setDisplay(fmt(rem));
      setRemainingMs(rem);
      if (rem <= 0) {
        setPhase('done');
        s.phase = 'done';
        setTimerData({ remainingMs: 0, totalMs: s.total, running: false, paused: false });
        return;
      }
      s.raf = requestAnimationFrame(tick);
    }
    s.raf = requestAnimationFrame(tick);

    s.sync = setInterval(() => {
      const rem = Math.max(0, s.until - Date.now());
      if (rem <= 0) {
        teardown();
        setPhase('done');
        s.phase = 'done';
        setTimerData({ remainingMs: 0, totalMs: s.total, running: false, paused: false });
      } else {
        setTimerData({ remainingMs: rem, totalMs: s.total, running: true, paused: false });
      }
    }, 1000);
  }

  function pause() {
    teardown();
    const s = stateRef.current;
    const rem = Math.max(0, s.until - Date.now());
    s.pausedRemaining = rem;
    setRemainingMs(rem);
    setPhase('paused');
    s.phase = 'paused';
    setTimerData({ remainingMs: rem, totalMs: s.total, running: true, paused: true });
  }

  function resume() {
    const s = stateRef.current;
    const until = Date.now() + s.pausedRemaining;
    s.until = until;
    setPhase('running');
    s.phase = 'running';
    setTimerData({ remainingMs: s.pausedRemaining, totalMs: s.total, running: true, paused: false });

    function tick() {
      const rem = Math.max(0, s.until - Date.now());
      setDisplay(fmt(rem));
      setRemainingMs(rem);
      if (rem <= 0) {
        setPhase('done');
        s.phase = 'done';
        setTimerData({ remainingMs: 0, totalMs: s.total, running: false, paused: false });
        return;
      }
      s.raf = requestAnimationFrame(tick);
    }
    s.raf = requestAnimationFrame(tick);

    s.sync = setInterval(() => {
      const rem = Math.max(0, s.until - Date.now());
      if (rem <= 0) {
        teardown();
        setPhase('done');
        s.phase = 'done';
        setTimerData({ remainingMs: 0, totalMs: s.total, running: false, paused: false });
      } else {
        setTimerData({ remainingMs: rem, totalMs: s.total, running: true, paused: false });
      }
    }, 1000);
  }

  function stop() {
    teardown();
    const s = stateRef.current;
    s.until = null;
    s.total = 0;
    setTotalMs(0);
    setRemainingMs(0);
    setDisplay('00:00');
    setPhase('idle');
    s.phase = 'idle';
    setTimerData({ remainingMs: 0, totalMs: 0, running: false, paused: false });
  }

  useEffect(() => () => teardown(), []);

  stateRef.current.phase = phase;

  const isIdle = phase === 'idle';
  const isDone = phase === 'done';
  const isRunning = phase === 'running';
  const isPaused = phase === 'paused';
  const progress = totalMs > 0 ? remainingMs / totalMs : 0;
  const isCritical = isRunning && totalMs > 0 && (remainingMs / totalMs) <= 0.1;

  return (
    <div className="timer-body">
      <div className="timer-presets">
        {PRESETS.map((p) => (
          <button key={p.ms} className="timer-preset-pill"
            disabled={!isIdle && !isDone}
            onClick={() => startMs(p.ms)}>
            <span className="preset-value">{p.label}</span>
            <span className="preset-unit">{p.unit}</span>
          </button>
        ))}
      </div>

      <div className={`timer-ring-wrap${isRunning ? ' pulse' : ''}${isCritical ? ' critical' : ''}`}>
        <Ring progress={progress} totalMs={totalMs} remainingMs={remainingMs}/>
        <div className={`timer-digits${isDone?' flash':''}${isPaused?' paused':''}${isRunning?' running':''}${isCritical?' critical':''}`}>{display}</div>
        {isDone && <div className="timer-done-label">ВРЕМЯ!</div>}
      </div>

      <div className="timer-controls-row">
        {isIdle && <button className="timer-ctrl" disabled>Старт</button>}
        {isRunning && <>
          <button className="timer-ctrl pause" onClick={pause}>Пауза</button>
          <button className="timer-ctrl stop" onClick={stop}>Стоп</button>
        </>}
        {isPaused && <>
          <button className="timer-ctrl resume" onClick={resume}>Продолжить</button>
          <button className="timer-ctrl stop" onClick={stop}>Сброс</button>
        </>}
        {isDone && <button className="timer-ctrl reset" onClick={stop}>Сброс</button>}
      </div>
    </div>
  );
}

export function TimerWidget() {
  const { state } = useTournament();
  const td = state.timerData || {};
  if (!td.running && !td.remainingMs) return null;

  const total = td.totalMs || 0;
  const rem = td.remainingMs || 0;
  const pct = total ? rem / total : 0;
  const isDone = !td.running && rem <= 0 && total > 0;
  const isPaused = td.paused;
  const isRunning = td.running && !td.paused;
  const isCritical = isRunning && total > 0 && pct <= 0.1;

  return (
    <div className="overlay-widget-inner">
      <div className={`timer-ring-wrap${isRunning ? ' pulse' : ''}${isCritical ? ' critical' : ''}`}>
        <Ring progress={pct} totalMs={total} remainingMs={rem} />
        <div className={`timer-digits${isDone ? ' flash' : ''}${isPaused ? ' paused' : ''}${isRunning ? ' running' : ''}${isCritical ? ' critical' : ''}`}>
          {fmt(rem)}
        </div>
        {isDone && <div className="timer-done-label">ВРЕМЯ!</div>}
      </div>
    </div>
  );
}
