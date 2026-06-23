import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../state/AuthContext.jsx';
import {
  getTournaments,
  createTournament,
  deleteTournament,
  startTournament,
  completeTournament,
} from '../utils/apiClient.js';

export default function TournamentsList() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState('');
  const [formMode, setFormMode] = useState('1x1');
  const [formRounds, setFormRounds] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const loadTournaments = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const list = await getTournaments(token);
      setTournaments(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  // Listen for WebSocket updates
  useEffect(() => {
    // We'll use the existing WebSocket from TournamentProvider via a custom event
    function handleWsMessage(e) {
      const msg = e.detail;
      if (msg && msg.type === 'tournaments') {
        setTournaments(msg.tournaments);
      }
    }
    window.addEventListener('ws-message', handleWsMessage);
    return () => window.removeEventListener('ws-message', handleWsMessage);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSubmitting(true);
    try {
      await createTournament({
        name: formName.trim(),
        mode: formMode,
        totalRounds: formRounds,
      }, token);
      setShowCreate(false);
      setFormName('');
      setFormMode('1x1');
      setFormRounds(3);
      await loadTournaments();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить турнир?')) return;
    try {
      await deleteTournament(id, token);
      await loadTournaments();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleStart = async (id) => {
    try {
      await startTournament(id, token);
      await loadTournaments();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleComplete = async (id) => {
    if (!confirm('Завершить турнир? Будут подсчитаны итоговые очки.')) return;
    try {
      await completeTournament(id, token);
      await loadTournaments();
    } catch (e) {
      setError(e.message);
    }
  };

  const statusLabel = {
    draft: 'Черновик',
    active: 'Активен',
    completed: 'Завершён',
  };

  const statusClass = {
    draft: 'badge-draft',
    active: 'badge-active',
    completed: 'badge-completed',
  };

  if (loading) {
    return <div className="tech-panel" style={{ padding: 20 }}><p style={{ color: 'var(--muted)' }}>Загрузка турниров…</p></div>;
  }

  return (
    <div className="tournaments-page">
      <div className="tournaments-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--display-font)', fontSize: 20 }}>Мои турниры</h2>
        <button
          className="roulette-btn"
          onClick={() => setShowCreate(!showCreate)}
          style={{ padding: '8px 16px' }}
        >
          {showCreate ? 'Отмена' : '+ Новый турнир'}
        </button>
      </div>

      {error && (
        <div className="tech-panel" style={{ padding: 12, marginBottom: 16, borderColor: 'var(--danger)' }}>
          <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="tech-panel" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ flex: '1 1 200px' }}>
              <span className="eyebrow">Название</span>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Битва за Респект"
                required
                autoFocus
                style={{ width: '100%' }}
              />
            </label>
            <label style={{ flex: '0 0 100px' }}>
              <span className="eyebrow">Режим</span>
              <select value={formMode} onChange={(e) => setFormMode(e.target.value)} style={{ width: '100%' }}>
                <option value="1x1">1×1</option>
                <option value="2x2">2×2</option>
              </select>
            </label>
            <label style={{ flex: '0 0 90px' }}>
              <span className="eyebrow">Раунды</span>
              <input
                type="number"
                value={formRounds}
                onChange={(e) => setFormRounds(Math.max(1, Math.min(20, parseInt(e.target.value) || 3)))}
                min={1}
                max={20}
                style={{ width: '100%' }}
              />
            </label>
            <button type="submit" className="roulette-btn" disabled={submitting} style={{ padding: '8px 20px' }}>
              {submitting ? 'Создание…' : 'Создать'}
            </button>
          </div>
        </form>
      )}

      {tournaments.length === 0 ? (
        <div className="tech-panel" style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>У вас пока нет турниров.</p>
          <p style={{ color: 'var(--cyan)', fontSize: 13 }}>Нажмите «+ Новый турнир», чтобы создать первый.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tournaments.map((t) => (
            <div key={t.id} className="tech-panel" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <span style={{ fontFamily: 'var(--display-font)', fontSize: 16 }}>{t.name}</span>
                  <span className={`badge ${statusClass[t.status] || ''}`} style={{ marginLeft: 10 }}>
                    {statusLabel[t.status] || t.status}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 10 }}>
                    {t.mode} · {t.total_rounds} раундов
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {t.status === 'draft' && (
                    <>
                      <button className="roulette-btn" onClick={() => handleStart(t.id)} style={{ padding: '6px 12px', fontSize: 13 }}>
                        ▶ Запустить
                      </button>
                      <button className="roulette-btn" onClick={() => handleDelete(t.id)} style={{ padding: '6px 12px', fontSize: 13, background: 'rgba(255,80,80,0.15)', borderColor: 'var(--danger)' }}>
                        Удалить
                      </button>
                    </>
                  )}
                  {t.status === 'active' && (
                    <button className="roulette-btn" onClick={() => handleComplete(t.id)} style={{ padding: '6px 12px', fontSize: 13 }}>
                      ⏹ Завершить
                    </button>
                  )}
                  {t.status === 'completed' && (
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                      Завершён: {new Date(t.completed_at).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
