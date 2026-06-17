import { useState } from 'react';
import Timer from '../components/Timer.jsx';

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
  removeTask,
  addPlayer,
  addTeam,
  removeParticipant,
  toggleStandings,
  resetTournament,
  addBonusTask,
  removeBonusTask,
  addComplication,
  updateComplication,
  removeComplication,
  setActiveTab,
  handleExport,
  handleImport,
}) {
  const [playerName, setPlayerName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamFirst, setTeamFirst] = useState('');
  const [teamSecond, setTeamSecond] = useState('');
  const [bonusText, setBonusText] = useState('');
  const [complicationText, setComplicationText] = useState('');
  const [pointsDraft, setPointsDraft] = useState(String(state.currentPoints ?? 0));

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
          <p className="eyebrow">Матч</p>
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
      </div>

      <section className="admin-card tech-panel">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Задания раунда</p>
            <h2>Задачи ({state.tasks.length})</h2>
          </div>
          <div className="button-pair">
            <button type="button" onClick={() => setActiveTab('templates')}>
              Добавить
            </button>
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
                      title="Удалить задание"
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
            <button type="button" onClick={() => setActiveTab('templates')}>
              Добавить
            </button>
          </div>
        </div>

        <div className="admin-task-list">
          {(state.extensions?.complications || []).map((comp) => (
            <div className="task-item" key={comp.id}>
              <label>
                <input
                  type="checkbox"
                  checked={comp.active !== false}
                  onChange={(event) =>
                    updateComplication(comp.id, {
                      active: event.target.checked,
                    })
                  }
                />
              </label>
              <div className="task-edit-fields">
                <textarea
                  value={comp.text}
                  rows="2"
                  onChange={(event) =>
                    updateComplication(comp.id, {
                      text: event.target.value,
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() => removeComplication(comp.id)}
                  title="Удалить усложнение"
                >
                  ×
                </button>
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

      <section className="admin-card tech-panel">
        <p className="eyebrow">Расширения</p>
        <div className="stub-stack">
          <article>
            <h3>Бонусные задания</h3>
            {(state.extensions?.bonusTasks || []).map((bonus) => (
              <p key={bonus.id}>
                {bonus.text}{' '}
                <button
                  type="button"
                  className="icon-danger"
                  onClick={() => removeBonusTask(bonus.id)}
                  style={{ padding: '0 6px', fontSize: 14 }}
                >
                  ×
                </button>
              </p>
            ))}
            <form
              className="inline-form"
              onSubmit={(e) => { e.preventDefault(); addBonusTask(bonusText); setBonusText(''); }}
              style={{ marginTop: 8 }}
            >
              <input
                type="text"
                value={bonusText}
                onChange={(e) => setBonusText(e.target.value)}
                placeholder="Новое бонусное задание"
              />
              <button type="submit" disabled={!bonusText.trim()}>Добавить</button>
            </form>
          </article>
          <article>
            <h3>Усложнения</h3>
            {(state.extensions?.complications || []).map((comp) => (
              <p key={comp.id}>
                {comp.text}{' '}
                <button
                  type="button"
                  className="icon-danger"
                  onClick={() => removeComplication(comp.id)}
                  style={{ padding: '0 6px', fontSize: 14 }}
                >
                  ×
                </button>
              </p>
            ))}
            <form
              className="inline-form"
              onSubmit={(e) => { e.preventDefault(); addComplication(complicationText); setComplicationText(''); }}
              style={{ marginTop: 8 }}
            >
              <input
                type="text"
                value={complicationText}
                onChange={(e) => setComplicationText(e.target.value)}
                placeholder="Новое усложнение"
              />
              <button type="submit" disabled={!complicationText.trim()}>Добавить</button>
            </form>
          </article>
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