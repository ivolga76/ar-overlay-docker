import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Timer from '../components/Timer.jsx';
import { getTemplates } from '../state/templateStore.js';
import { useAuth } from '../state/AuthContext.jsx';
import { getContracts } from '../utils/apiClient.js';
import { getStoredSeasonId } from './Settings.jsx';

function TeamLabel({ participant }) {
  if (!participant?.players?.length) return null;
  return <small>{participant.players.map((player) => player.name).join(' / ')}</small>;
}

export default function AdminOverlayTab({
  state,
  participants,
  currentParticipant,
  standings,
  setMode,
  setRound,
  selectParticipant,
  updateCurrentName,
  adjustPoints,
  setCurrentPoints,
  updateTask,
  addTask,
  removeTask,
  addPlayer,
  addTeam,
  removeParticipant,
  toggleStandings,
  toggleWidgetVisibility,
  resetTournament,
  addComplication,
  updateComplication,
  removeComplication,
  setActiveTab,
  handleExport,
  handleImport,
  spinRoulette,
  setRouletteItems,
}) {
  const [playerName, setPlayerName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamFirst, setTeamFirst] = useState('');
  const [teamSecond, setTeamSecond] = useState('');
  const [pointsDraft, setPointsDraft] = useState(String(state.currentPoints ?? 0));

  // ── Contracts state (must be before roulettePool) ─────────
  const { token } = useAuth();
  const [contractPool, setContractPool] = useState([]);
  const [contractsLoaded, setContractsLoaded] = useState(false);

  // Season-aware labels (must be before roulettePool)
  const currentSeasonId = getStoredSeasonId();
  const isSeason2 = currentSeasonId === 'season-2';
  const taskLabel = isSeason2 ? 'Контракты' : 'Задачи';
  const taskLabelSingular = isSeason2 ? 'контракт' : 'задание';

  // Roulette: season 2 uses contracts, season 1 uses task templates
  const roulettePool = useMemo(() => {
    if (isSeason2) {
      if (!contractsLoaded) return [];
      const usedTexts = new Set(state.tasks.map((t) => t.text.trim()));
      return contractPool.filter((c) => !usedTexts.has(c.text.trim()));
    }
    const allTemplates = getTemplates().tasks;
    const usedTexts = new Set(state.tasks.map((t) => t.text.trim()));
    return allTemplates.filter((tpl) => !usedTexts.has(tpl.text));
  }, [state.tasks, isSeason2, contractsLoaded, contractPool]);

  const [spinning, setSpinning] = useState(false);
  const [spinningText, setSpinningText] = useState('');

  // Complication roulette
  const complicationRoulettePool = useMemo(() => {
    const allTemplates = getTemplates().complications;
    const usedTexts = new Set((state.extensions?.complications || []).map((c) => c.text.trim()));
    return allTemplates.filter((tpl) => !usedTexts.has(tpl.text));
  }, [state.extensions?.complications]);

  const [spinningComp, setSpinningComp] = useState(false);
  const [spinningCompText, setSpinningCompText] = useState('');

  // ── Contracts roulette (Season 2) ─────────────────────

  const loadContractPool = useCallback(async () => {
    if (!token) return;
    const seasonId = getStoredSeasonId();
    try {
      const list = await getContracts(seasonId, token);
      setContractPool(list);
      setContractsLoaded(true);
    } catch {
      setContractsLoaded(true);
    }
  }, [token]);

  useEffect(() => { loadContractPool(); }, [loadContractPool]);

  const contractRoulettePool = useMemo(() => {
    if (!contractsLoaded) return [];
    const usedTexts = new Set(state.tasks.map((t) => t.text.trim()));
    return contractPool.filter((c) => !usedTexts.has(c.text.trim()));
  }, [contractPool, state.tasks, contractsLoaded]);

  const [spinningContract, setSpinningContract] = useState(false);
  const [spinningContractText, setSpinningContractText] = useState('');

  function handleContractRoulette() {
    if (contractRoulettePool.length === 0 || spinningContract) return;
    const pick = contractRoulettePool[Math.floor(Math.random() * contractRoulettePool.length)];

    setSpinningContract(true);
    const start = Date.now();
    const DURATION = 3000;

    function cycle() {
      const elapsed = Date.now() - start;
      if (elapsed >= DURATION) {
        addTask(pick.text, pick.points);
        setSpinningContract(false);
        setSpinningContractText('');
        return;
      }
      const randomC = contractRoulettePool[Math.floor(Math.random() * contractRoulettePool.length)];
      setSpinningContractText(randomC.text);
      const progress = elapsed / DURATION;
      const delay = progress < 0.7 ? 50 : progress < 0.85 ? 120 : 250;
      setTimeout(cycle, delay);
    }
    cycle();
  }

  function handleComplicationRoulette() {
    if (complicationRoulettePool.length === 0 || spinningComp) return;

    const pick = complicationRoulettePool[Math.floor(Math.random() * complicationRoulettePool.length)];

    setSpinningComp(true);
    const start = Date.now();
    const DURATION = 3000;

    function cycle() {
      const elapsed = Date.now() - start;
      if (elapsed >= DURATION) {
        addComplication(pick.text);
        setSpinningComp(false);
        setSpinningCompText('');
        return;
      }
      const randomComp = complicationRoulettePool[Math.floor(Math.random() * complicationRoulettePool.length)];
      setSpinningCompText(randomComp.text);

      const progress = elapsed / DURATION;
      const delay = progress < 0.7 ? 50 : progress < 0.85 ? 120 : 250;
      setTimeout(cycle, delay);
    }

    cycle();
  }

  function handleRoulette() {
    if (roulettePool.length === 0 || spinning) return;

    // Pick the final task before animation starts
    const pick = roulettePool[Math.floor(Math.random() * roulettePool.length)];

    setSpinning(true);
    const start = Date.now();
    const DURATION = 3000;

    function cycle() {
      const elapsed = Date.now() - start;
      if (elapsed >= DURATION) {
        addTask(pick.text, pick.points);
        setSpinning(false);
        setSpinningText('');
        return;
      }
      const randomTask = roulettePool[Math.floor(Math.random() * roulettePool.length)];
      setSpinningText(randomTask.text);

      // Speed: fast (0-70%) → medium (70-85%) → slow (85-100%)
      const progress = elapsed / DURATION;
      const delay = progress < 0.7 ? 50 : progress < 0.85 ? 120 : 250;
      setTimeout(cycle, delay);
    }

    cycle();
  }

  // Sync draft when state.currentPoints changes externally (e.g. WebSocket, task completion)
  // but only if the user isn't currently editing
  const [editingPoints, setEditingPoints] = useState(false);
  if (!editingPoints && String(state.currentPoints) !== pointsDraft) {
    // Use a microtask to avoid setState-during-render warnings in React 19
    queueMicrotask(() => setPointsDraft(String(state.currentPoints)));
  }

  function handleAddPlayer(event) {
    event.preventDefault();
    addPlayer(playerName);
    setPlayerName('');
  }

  function handleAddTeam(event) {
    event.preventDefault();
    addTeam(teamName, teamFirst, teamSecond);
    setTeamName('');
    setTeamFirst('');
    setTeamSecond('');
  }

  function handlePointsBlur() {
    setEditingPoints(false);
    const n = parseInt(pointsDraft, 10);
    if (!Number.isNaN(n)) {
      setCurrentPoints(n);
    } else {
      setPointsDraft(String(state.currentPoints));
    }
  }

  return (
    <section className="admin-grid">
      <div className="admin-stack">
        <section className="admin-card tech-panel">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Матч</p>
            </div>
            <div className="button-pair">
              {(() => {
                const standingsWidget = state.overlayLayout?.find(w => w.id === 'standings');
                const visible = standingsWidget ? standingsWidget.visible !== false : false;
                return (
                  <button type="button" className="roulette-btn" onClick={() => toggleWidgetVisibility('standings')}>
                    {visible ? 'Скрыть versus' : 'Показать versus'}
                  </button>
                );
              })()}
            </div>
          </div>
        <div className="field-row">
          <label>Режим турнира</label>
          <div className="segmented">
            <button
              className={state.mode === '1x1' ? 'active' : ''}
              type="button"
              onClick={() => setMode('1x1')}
            >
              1×1
            </button>
            <button
              className={state.mode === '2x2' ? 'active' : ''}
              type="button"
              onClick={() => setMode('2x2')}
            >
              2×2
            </button>
          </div>
        </div>

        <div className="field-row">
          <label>Номер раунда</label>
          <div className="round-stepper">
            <button type="button" onClick={() => setRound(state.currentRound - 1)} disabled={state.currentRound <= 1}>−</button>
            <span className="round-value">{state.currentRound}</span>
            <button type="button" onClick={() => setRound(state.currentRound + 1)} disabled={state.currentRound >= state.totalRounds}>+</button>
          </div>
        </div>

        <div className="field-row">
          <label htmlFor="participant">Текущий участник</label>
          <select
            id="participant"
            value={state.currentParticipantId}
            onChange={(event) => selectParticipant(event.target.value)}
          >
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <label htmlFor="display-name">Имя в overlay</label>
          <input
            id="display-name"
            type="text"
            value={currentParticipant?.name || ''}
            onChange={(event) => updateCurrentName(event.target.value)}
            placeholder="Имя игрока или команды"
          />
        </div>

        <div className="score-controls">
          <button type="button" onClick={() => adjustPoints(-1)}>
            -1
          </button>
          <label>
            Очки в текущем раунде
            <input
              min="0"
              type="number"
              value={pointsDraft}
              onFocus={() => setEditingPoints(true)}
              onChange={(event) => setPointsDraft(event.target.value)}
              onBlur={handlePointsBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            />
          </label>
          <button type="button" onClick={() => adjustPoints(1)}>
            +1
          </button>
        </div>

      </section>

        <section className="admin-card tech-panel timer-card">
          <p className="eyebrow">Таймер</p>
          <Timer />
        </section>

        <section className="admin-card tech-panel">
          <p className="eyebrow">Рулетка (виджет оверлея)</p>
          <div className="button-pair" style={{ marginTop: 8 }}>
            {isSeason2 && contractPool.length > 0 && (
              <button
                type="button"
                className="roulette-btn"
                onClick={() => setRouletteItems(contractPool)}
                title="Загрузить все контракты в рулетку"
                style={{ background: 'rgba(255,0,128,0.1)', borderColor: 'var(--magenta)' }}
              >
                📋 Контракты
              </button>
            )}
            {!isSeason2 && roulettePool.length > 0 && (
              <button
                type="button"
                className="roulette-btn"
                onClick={() => setRouletteItems(roulettePool)}
                title="Загрузить все задания в рулетку"
              >
                📋 Задания
              </button>
            )}
            <button
              type="button"
              className="roulette-btn"
              onClick={spinRoulette}
              disabled={(!state.rouletteItems || state.rouletteItems.length === 0) && state.tasks.length === 0}
              title={((!state.rouletteItems || state.rouletteItems.length === 0) && state.tasks.length === 0) ? 'Нет пунктов для рулетки' : 'Запустить рулетку в оверлее'}
              style={{ flex: 1, padding: '12px', fontSize: 16 }}
            >
              🎰 Крутить
            </button>
            {state.rouletteItems && state.rouletteItems.length > 0 && (
              <button
                type="button"
                onClick={() => setRouletteItems([])}
                title="Очистить рулетку"
                style={{ padding: '12px 10px', fontSize: 14 }}
              >
                ✕
              </button>
            )}
          </div>
          {state.rouletteItems && state.rouletteItems.length > 0 && (
            <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: 12 }}>
              В рулетке: {state.rouletteItems.length} пункт(ов)
            </div>
          )}
        </section>
      </div>

      <section className="admin-card tech-panel">
        <div className="card-heading">
          <div>
            <p className="eyebrow">{isSeason2 ? 'Контракты раунда' : 'Задания раунда'}</p>
            <h2>{taskLabel} ({state.tasks.length})</h2>
          </div>
          <div className="button-pair">
            <button
              type="button"
              className={`roulette-btn${spinning ? ' spinning' : ''}`}
              onClick={handleRoulette}
              disabled={roulettePool.length === 0 || spinning}
              title={roulettePool.length === 0 ? (isSeason2 ? 'Все контракты уже добавлены' : 'Все шаблоны уже добавлены') : spinning ? (isSeason2 ? 'Подбор контракта…' : 'Подбор задания…') : (isSeason2 ? 'Добавить случайный контракт из пула сезона' : 'Добавить случайное задание из шаблонов')}
            >
              {spinning ? spinningText : 'Рулетка'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(isSeason2 ? 'contracts' : 'templates')}
            >
              Добавить
            </button>
            {!isSeason2 && contractsLoaded && contractRoulettePool.length > 0 && (
              <button
                type="button"
                className={`roulette-btn${spinningContract ? ' spinning' : ''}`}
                onClick={handleContractRoulette}
                disabled={contractRoulettePool.length === 0 || spinningContract}
                title={spinningContract ? 'Подбор контракта…' : 'Добавить случайный контракт из пула сезона'}
                style={{ background: 'rgba(255,0,128,0.1)', borderColor: 'var(--magenta)' }}
              >
                {spinningContract ? spinningContractText : '📋 Контракт'}
              </button>
            )}
          </div>
        </div>

        <div className="admin-task-list">
          {state.tasks.map((task) => (
            <div className={`task-item ${task.completed ? 'checked' : ''}`} key={task.id}>
              <label>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={(event) =>
                    updateTask(task.id, {
                      completed: event.target.checked,
                    })
                  }
                />
              </label>
              <div className="task-edit-fields">
                <textarea
                  value={task.text}
                  rows="2"
                  onChange={(event) =>
                    updateTask(task.id, {
                      text: event.target.value,
                    })
                  }
                />
                <span>
                  Стоимость
                  <div className="task-points-stepper">
                    <button type="button" onClick={() => updateTask(task.id, { points: Math.max(0, (task.points ?? 1) - 1) })}>−</button>
                    <span>{task.points ?? 1}</span>
                    <button type="button" onClick={() => updateTask(task.id, { points: (task.points ?? 1) + 1 })}>+</button>
                    <button
                      type="button"
                      onClick={() => removeTask(task.id)}
                      title={`Удалить ${taskLabelSingular}`}
                    >
                      ×
                    </button>
                  </div>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-card tech-panel">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Усложнения раунда</p>
            <h2>Усложнения ({(state.extensions?.complications || []).length})</h2>
          </div>
          <div className="button-pair">
            <button
              type="button"
              className={`roulette-btn${spinningComp ? ' spinning' : ''}`}
              onClick={handleComplicationRoulette}
              disabled={complicationRoulettePool.length === 0 || spinningComp}
              title={complicationRoulettePool.length === 0 ? 'Все шаблоны усложнений уже добавлены' : spinningComp ? 'Подбор усложнения…' : 'Добавить случайное усложнение из шаблонов'}
            >
              {spinningComp ? spinningCompText : 'Рулетка'}
            </button>
            <button type="button" onClick={() => setActiveTab('templates')}>
              Добавить
            </button>
          </div>
        </div>

        <div className="admin-task-list">
          {(state.extensions?.complications || []).map((comp) => (
            <div className="task-item" key={comp.id}>
              <div className="task-edit-fields" style={{ gridColumn: '1 / -1' }}>
                <textarea
                  value={comp.text}
                  rows="2"
                  onChange={(event) =>
                    updateComplication(comp.id, {
                      text: event.target.value,
                    })
                  }
                />
                <span>
                  Штраф
                  <div className="task-points-stepper">
                    <button type="button" onClick={() => adjustPoints(-1)} title="−1 за нарушение">−</button>
                    <span>1</span>
                    <button type="button" onClick={() => adjustPoints(1)} title="+1 (отмена штрафа)">+</button>
                    <button type="button" onClick={() => removeComplication(comp.id)} title="Удалить усложнение">×</button>
                  </div>
                </span>
              </div>
            </div>
          ))}

        </div>
      </section>

      <section className="admin-card tech-panel">
        <p className="eyebrow">Участники</p>

        {state.mode === '1x1' ? (
          <form className="inline-form" onSubmit={handleAddPlayer}>
            <input
              type="text"
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="Имя игрока"
            />
            <button type="submit">Добавить</button>
          </form>
        ) : (
          <form className="team-form" onSubmit={handleAddTeam}>
            <input
              type="text"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Название команды"
            />
            <input
              type="text"
              value={teamFirst}
              onChange={(event) => setTeamFirst(event.target.value)}
              placeholder="Игрок 1"
            />
            <input
              type="text"
              value={teamSecond}
              onChange={(event) => setTeamSecond(event.target.value)}
              placeholder="Игрок 2"
            />
            <button type="submit">Добавить команду</button>
          </form>
        )}

        <div className="participant-list">
          {participants.map((participant) => (
            <article
              className={participant.id === state.currentParticipantId ? 'selected' : ''}
              key={participant.id}
            >
              <button type="button" onClick={() => selectParticipant(participant.id)}>
                <strong>{participant.name}</strong>
                <TeamLabel participant={participant} />
              </button>
              <span>{participant.totalPoints} оч.</span>
              <button
                aria-label={`Удалить ${participant.name}`}
                className="icon-danger"
                type="button"
                onClick={() => removeParticipant(participant.id)}
              >
                ×
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-card tech-panel standings-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Итоги</p>
            <h2>Таблица</h2>
          </div>
          <button type="button" onClick={() => { if (window.confirm('Сбросить весь турнир? Данные будут потеряны.')) resetTournament(); }}>
            Новый турнир
          </button>
        </div>
        <div className="button-pair" style={{ marginTop: 10 }}>
          <button type="button" onClick={handleExport}>
            Экспорт
          </button>
          <button type="button" onClick={handleImport}>
            Импорт
          </button>
        </div>
        <ol className="admin-standings">
          {standings.map((participant) => (
            <li key={participant.id}>
              <span>{participant.name}</span>
              <strong>{participant.totalPoints}</strong>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}