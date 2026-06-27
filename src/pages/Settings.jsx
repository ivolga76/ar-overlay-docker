import { useState, useEffect } from 'react';
import { useTournament } from '../state/TournamentContext.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import { getSeasons } from '../utils/apiClient.js';

export const SEASON_STORAGE_KEY = 'ar-overlay:season';

export function getStoredSeasonId() {
  return localStorage.getItem(SEASON_STORAGE_KEY) || 'season-2';
}

export default function Settings() {
  const { state, setTournamentName, setTotalRounds, setSoundEnabled } = useTournament();
  const { user, changePassword, token } = useAuth();

  const [nameDraft, setNameDraft] = useState(state.tournamentName || '');
  const [roundsDraft, setRoundsDraft] = useState(String(state.totalRounds || 3));
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(getStoredSeasonId());

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNew, setConfirmNew] = useState('');
  const [secMsg, setSecMsg] = useState({ text: '', type: '' });
  const [secBusy, setSecBusy] = useState(false);

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

  // Load seasons from API
  useEffect(() => {
    if (!token) return;
    getSeasons(token)
      .then(setSeasons)
      .catch(() => {});
  }, [token]);

  function handleSeasonChange(seasonId) {
    setSelectedSeasonId(seasonId);
    localStorage.setItem(SEASON_STORAGE_KEY, seasonId);
  }

  function handleSoundToggle() {
    setSoundEnabled(!state.soundEnabled);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setSecMsg({ text: '', type: '' });

    if (!oldPassword || !newPassword || !confirmNew) {
      setSecMsg({ text: 'Заполните все поля', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setSecMsg({ text: 'Новый пароль должен быть не менее 6 символов', type: 'error' });
      return;
    }
    if (newPassword !== confirmNew) {
      setSecMsg({ text: 'Новые пароли не совпадают', type: 'error' });
      return;
    }

    setSecBusy(true);
    try {
      await changePassword(oldPassword, newPassword);
      // changePassword clears auth → user will be redirected to login
    } catch (err) {
      setSecMsg({ text: err.message || 'Ошибка сервера', type: 'error' });
      setSecBusy(false);
    }
  }

  return (
    <section className="admin-grid settings-grid">
      {/* Tournament settings */}
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

      {/* Season selector */}
      <section className="admin-card tech-panel">
        <p className="eyebrow">Сезон</p>
        <h2>Текущий сезон</h2>

        <div className="field-row">
          <label htmlFor="settings-season">Выберите сезон</label>
          {seasons.length > 0 ? (
            <select
              id="settings-season"
              value={selectedSeasonId}
              onChange={(e) => handleSeasonChange(e.target.value)}
              style={{ width: '100%' }}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.status === 'active' ? '(активен)' : '(архив)'}
                </option>
              ))}
            </select>
          ) : (
            <p className="setting-hint">Загрузка сезонов…</p>
          )}
        </div>
        <p className="setting-hint">
          Выбранный сезон используется во вкладках «Контракты», «Протоколы» и «Легендарные».
          Новые турниры по умолчанию создаются в последнем активном сезоне.
        </p>
      </section>

      {/* Sound settings */}
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

      {/* Data management */}
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

      {/* Security — password change */}
      <section className="admin-card tech-panel security-card">
        <p className="eyebrow">Безопасность</p>
        <h2>Смена пароля</h2>

        {user && (
          <p className="setting-hint">
            Вы вошли как <strong>{user.email}</strong>
          </p>
        )}

        <form onSubmit={handleChangePassword}>
          <div className="field-row">
            <label htmlFor="sec-old">Текущий пароль</label>
            <input
              id="sec-old"
              type="password"
              value={oldPassword}
              onChange={(e) => { setOldPassword(e.target.value); setSecMsg({ text: '', type: '' }); }}
              placeholder="••••••"
              autoComplete="current-password"
            />
          </div>

          <div className="field-row">
            <label htmlFor="sec-new">Новый пароль</label>
            <input
              id="sec-new"
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setSecMsg({ text: '', type: '' }); }}
              placeholder="Не менее 6 символов"
              autoComplete="new-password"
            />
          </div>

          <div className="field-row">
            <label htmlFor="sec-confirm">Подтверждение</label>
            <input
              id="sec-confirm"
              type="password"
              value={confirmNew}
              onChange={(e) => { setConfirmNew(e.target.value); setSecMsg({ text: '', type: '' }); }}
              placeholder="Повторите новый пароль"
              autoComplete="new-password"
            />
          </div>

          {secMsg.text && (
            <p className={`security-msg ${secMsg.type}`}>{secMsg.text}</p>
          )}

          <button
            type="submit"
            className="change-password-btn"
            disabled={secBusy}
          >
            {secBusy ? 'Смена пароля…' : 'Сменить пароль'}
          </button>
        </form>
      </section>
    </section>
  );
}
