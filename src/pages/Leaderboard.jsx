import { useState, useEffect } from 'react';
import { getGlobalLeaderboard } from '../utils/apiClient.js';

export default function Leaderboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getGlobalLeaderboard(50)
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="auth-page" style={{ textAlign: 'center', paddingTop: '10vh' }}>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--display-font)' }}>Загрузка рейтинга…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="auth-page" style={{ textAlign: 'center', paddingTop: '10vh' }}>
        <p className="eyebrow" style={{ color: 'var(--danger)' }}>Ошибка</p>
        <p style={{ color: 'var(--muted)' }}>{error}</p>
      </main>
    );
  }

  return (
    <main className="leaderboard-page" style={{
      maxWidth: 800,
      margin: '0 auto',
      padding: '20px',
      minHeight: '100vh',
      background: 'transparent',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32, marginTop: 20 }}>
        <p className="eyebrow">Arc Raiders Overlay</p>
        <h1 style={{ fontFamily: 'var(--display-font)', fontSize: 28 }}>Рейтинг игроков</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Топ-{entries.length} участников всех завершённых турниров
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="tech-panel" style={{ padding: 30, textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>Пока нет завершённых турниров.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.map((entry, i) => {
            const isTop3 = i < 3;
            const medalEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
            return (
              <div
                key={`${entry.tournament_id}-${entry.participant_id}`}
                className="tech-panel"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  borderColor: isTop3 ? 'var(--gold, #ffd700)' : undefined,
                  background: isTop3 ? 'rgba(255, 215, 0, 0.04)' : undefined,
                }}
              >
                <span style={{
                  minWidth: 30,
                  textAlign: 'center',
                  fontSize: 18,
                  fontWeight: 700,
                  color: isTop3 ? 'var(--gold, #ffd700)' : 'var(--muted)',
                }}>
                  {medalEmoji || `#${i + 1}`}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--display-font)', fontSize: 15 }}>
                    {entry.participant_name}
                    {entry.participant_type === 'team' && (
                      <span style={{ color: 'var(--cyan)', fontSize: 11, marginLeft: 6 }}>команда</span>
                    )}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 11 }}>
                    {entry.tournament_name} · {entry.tournament_mode}
                    {entry.organizer_name ? ` · ${entry.organizer_name}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--display-font)', fontSize: 18, color: 'var(--cyan)' }}>
                    {entry.total_points} pts
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 10 }}>
                    Rank #{entry.tournament_rank} в турнире
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
