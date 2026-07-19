import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../state/AuthContext.jsx';
import {
  getTournaments,
  createTournament,
  deleteTournament,
  startTournament,
  completeTournament,
  getSeasons,
} from '../utils/apiClient.js';

export default function TournamentsList() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState('');
  const [formMode, setFormMode] = useState('1x1');
  const [formRounds, setFormRounds] = useState(3);
  const [formSeasonId, setFormSeasonId] = useState('');
  const [filterSeasonId, setFilterSeasonId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [formType, setFormType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadTournaments = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const list = await getTournaments(token, filterSeasonId || undefined, filterType || undefined);
      setTournaments(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, filterSeasonId, filterType]);

  const loadSeasons = useCallback(async () => {
    if (!token) return;
    try {
      const list = await getSeasons(token);
      setSeasons(list);
      // Default to latest active season
      const active = list.filter((s) => s.status === 'active');
      if (active.length > 0 && !formSeasonId) {
        setFormSeasonId(active[active.length - 1].id);
        setFilterSeasonId(active[active.length - 1].id);
      }
    } catch {
      // seasons may fail if not authorized; that's OK
    }
  }, [token]);

  useEffect(() => {
    loadSeasons();
  }, [loadSeasons]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  // Listen for WebSocket updates
  useEffect(() => {
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
        season_id: formSeasonId || undefined,
        type: formType || undefined,
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

  const seasonName = (id) => {
    const s = seasons.find((s) => s.id === id);
    return s ? s.name : id;
  };

  if (loading) {
    return <div className="tech-panel" style={{ padding: 20 }}><p style={{ color: 'var(--muted)' }}>Загрузка турниров…</p></div>;
  }

  return (
    <div className="tournaments-page">
      <div className="tournaments-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--display-font)', fontSize: 20 }}>Мои турниры</h2>
          {seasons.length > 0 && (
            <select
              value={filterSeasonId}
              onChange={(e) => { setFilterSeasonId(e.target.value); setLoading(true); }}
              style={{ padding: '4px 8px', fontSize: 12 }}
            >
              <option value="">Все сезоны</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setLoading(true); }}
            style={{ padding: '4px 8px', fontSize: 12 }}
          >
            <option value="">Все типы</option>
            <option value="pve">PvE</option>
            <option value="pvp">PvP</option>
            <option value="pvpve">PvPvE</option>
          </select>
        </div>
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
            <label style={{ flex: '0 0 100px' }}>
              <span className="eyebrow">Тип</span>
              <select value={formType} onChange={(e) => setFormType(e.target.value)} style={{ width: '100%' }}>
                <option value="">—</option>
                <option value="pve">PvE</option>
                <option value="pvp">PvP</option>
                <option value="pvpve">PvPvE</option>
              </select>
            </label>
            {seasons.length > 0 && (
              <label style={{ flex: '0 0 150px' }}>
                <span className="eyebrow">Сезон</span>
                <select value={formSeasonId} onChange={(e) => setFormSeasonId(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Авто</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
            )}
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
                  {t.type && (
                    <span style={{
                      color: 'var(--accent)',
                      fontSize: 11,
                      marginLeft: 8,
                      padding: '1px 6px',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                    }}>
                      {t.type.toUpperCase()}
                    </span>
                  )}
                  {t.season_id && (
                    <span style={{ color: 'var(--cyan)', fontSize: 11, marginLeft: 8 }}>
                      {seasonName(t.season_id)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {t.status === 'draft' && (
                    <>
                      <button className="roulette-btn" onClick={() => handleStart(t.id)} style={{ padding: '6px 12px', fontSize: 13 }}>
                        ▶ Старт
                      </button>
                      <button className="roulette-btn" onClick={() => handleDelete(t.id)} style={{ padding: '6px 12px', fontSize: 13, color: 'var(--danger)' }}>
                        ✕ Удалить
                      </button>
                    </>
                  )}
                  {t.status === 'active' && (
                    <button className="roulette-btn" onClick={() => handleComplete(t.id)} style={{ padding: '6px 12px', fontSize: 13 }}>
                      ✓ Завершить
                    </button>
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
