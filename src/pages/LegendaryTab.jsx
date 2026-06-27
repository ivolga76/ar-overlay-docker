import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../state/AuthContext.jsx';
import { getLegendaryContracts, updateContract } from '../utils/apiClient.js';
import { getStoredSeasonId } from './Settings.jsx';

const CATEGORIES = {
  pve: 'PvE',
  pvp: 'PvP',
  pvpve: 'PvPvE',
  boosty: 'Boosty',
};

export default function LegendaryTab() {
  const { token } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    const seasonId = getStoredSeasonId();
    try {
      setError(null);
      const list = await getLegendaryContracts(seasonId, token);
      setContracts(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleClearCompletion = async (contract) => {
    if (!confirm(`Сбросить выполнение контракта «${contract.text.slice(0, 60)}…»?`)) return;
    try {
      await updateContract(getStoredSeasonId(), contract.id, {
        completed_by: null,
        completed_at: null,
      }, token);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const available = contracts.filter((c) => !c.completed_by);
  const completed = contracts.filter((c) => c.completed_by);

  if (loading) {
    return <div className="tech-panel" style={{ padding: 20 }}><p style={{ color: 'var(--muted)' }}>Загрузка легендарных контрактов…</p></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--display-font)', fontSize: 20 }}>
          🏆 Легендарные контракты ({contracts.length})
        </h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ color: 'var(--gold)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
            ▣ {available.length} доступно
          </span>
          <span style={{ color: 'var(--muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
            ✓ {completed.length} выполнено
          </span>
        </div>
      </div>

      {error && (
        <div className="tech-panel" style={{ padding: 12, marginBottom: 16, borderColor: 'var(--danger)' }}>
          <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>
        </div>
      )}

      {contracts.length === 0 ? (
        <div className="tech-panel" style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>Нет легендарных контрактов.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {contracts.map((c) => {
            const isDone = !!c.completed_by;
            return (
              <div
                key={c.id}
                className="tech-panel"
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  opacity: isDone ? 0.6 : 1,
                  borderLeft: isDone ? '3px solid var(--gold)' : '3px solid var(--muted)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 18,
                      filter: isDone ? 'grayscale(0)' : 'grayscale(1)',
                    }}>
                      {isDone ? '🏆' : '🔒'}
                    </span>
                    <span style={{ fontSize: 13, wordBreak: 'break-word', fontWeight: isDone ? 600 : 400 }}>
                      {c.text}
                    </span>
                  </div>
                  <div style={{ marginLeft: 26 }}>
                    <span className="badge" style={{ fontSize: 11, background: 'var(--gold)', color: '#000', marginRight: 6 }}>
                      {c.points} баллов
                    </span>
                    <span className="badge" style={{ fontSize: 11, background: 'var(--muted)', marginRight: 6 }}>
                      {CATEGORIES[c.category] || c.category}
                    </span>
                    {c.boosty_author && (
                      <span style={{ color: 'var(--magenta)', fontSize: 12 }}>от {c.boosty_author}</span>
                    )}
                    {isDone && (
                      <span style={{ color: 'var(--gold)', fontSize: 12, marginLeft: 8 }}>
                        ✓ Выполнен: {c.completed_by} ({c.completed_at?.slice(0, 10)})
                      </span>
                    )}
                  </div>
                </div>
                {isDone && (
                  <button
                    className="roulette-btn"
                    onClick={() => handleClearCompletion(c)}
                    style={{ padding: '4px 10px', fontSize: 11, flexShrink: 0 }}
                    title="Сбросить выполнение"
                  >
                    ↩ Сбросить
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
