import { useState } from 'react';
import { useTournament } from '../state/TournamentContext.jsx';

export default function Settings() {
  const { state, setTournamentName, setTotalRounds, setSoundEnabled } = useTournament();

  const [nameDraft, setNameDraft] = useState(state.tournamentName || '');
  const [roundsDraft, setRoundsDraft] = useState(String(state.totalRounds || 3));

  function handleNameBlur() {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== state.tournamentName) {
      setTournamentName(trimmed);
    } else if (!trimmed) {
      setNameDraft(state.tournamentName || '');
    }
  }

  function handleRoundsBlur() {
    const n = parseInt(roundsDraft, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= 10 && n !== state.totalRounds) {
      setTotalRounds(n);
    } else if (Number.isNaN(n) || n < 1) {
      setRoundsDraft(String(state.totalRounds));
    }
  }

  function handleSoundToggle() {
    setSoundEnabled(!state.soundEnabled);
  }

  return (
    <section className="admin-grid settings-grid">
      <section className="admin-card tech-panel">
        <p className="eyebrow">Турнир</p>
        <h2>Основные настройки</h2>

        <div className="field-row">
          <label htmlFor="settings-name">Название турнира</label>
          <input
            id="settings-name"
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            placeholder="Битва за Респект"
          />
        </div>

        <div className="field-row">
          <label htmlFor="settings-rounds">Количество раундов</label>
          <div className="round-stepper">
            <button
              type="button"
              onClick={() => {
                const n = Math.max(1, (parseInt(roundsDraft, 10) || 3) - 1);
                setRoundsDraft(String(n));
                setTotalRounds(n);
              }}
              disabled={(parseInt(roundsDraft, 10) || 3) <= 1}
            >
              −
            </button>
            <input
              id="settings-rounds"
              className="round-value-input"
              type="number"
              min="1"
              max="10"
              value={roundsDraft}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '');
                setRoundsDraft(v);
              }}
              onBlur={handleRoundsBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            />
            <button
              type="button"
              onClick={() => {
                const n = Math.min(10, (parseInt(roundsDraft, 10) || 3) + 1);
                setRoundsDraft(String(n));
                setTotalRounds(n);
              }}
              disabled={(parseInt(roundsDraft, 10) || 3) >= 10}
            >
              +
            </button>
          </div>
        </div>
      </section>

      <section className="admin-card tech-panel">
        <p className="eyebrow">Звук</p>
        <h2>Звуковые эффекты</h2>

        <div className="field-row">
          <label>Звуки переключений</label>
          <div className="segmented">
            <button
              type="button"
              className={state.soundEnabled ? 'active' : ''}
              onClick={handleSoundToggle}
            >
              {state.soundEnabled ? 'Вкл' : 'Выкл'}
            </button>
          </div>
        </div>
        <p className="setting-hint">
          Звуки воспроизводятся при смене участника и раунда в админке.
        </p>
      </section>

      <section className="admin-card tech-panel">
        <p className="eyebrow">Данные</p>
        <h2>Управление данными</h2>

        <div className="field-row">
          <label>Экспорт / Импорт состояния</label>
          <div className="button-pair">
            <button
              type="button"
              onClick={() => {
                const raw = localStorage.getItem('battle-for-respect:v1');
                const blob = new Blob([raw || '{}'], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `arc-raiders-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Экспорт
            </button>
            <button
              type="button"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (re) => {
                    try {
                      JSON.parse(re.target.result);
                      localStorage.setItem('battle-for-respect:v1', re.target.result);
                      window.location.reload();
                    } catch {
                      alert('Неверный формат файла');
                    }
                  };
                  reader.readAsText(file);
                };
                input.click();
              }}
            >
              Импорт
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
