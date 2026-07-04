import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminStats } from '@/lib/api';

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) redirect('/admin/login');

  let stats;
  try {
    stats = await getAdminStats(token);
  } catch {
    stats = null;
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Не удалось загрузить статистику. Проверьте подключение к API.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="heading-section">Дашборд</h1>
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-value text-accent-primary">{stats.seasons.total}</div>
          <div className="stat-label">Сезонов ({stats.seasons.active} активно)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-accent-cyan">{stats.tournaments.total}</div>
          <div className="stat-label">Турниров ({stats.tournaments.completed} завершено)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-accent-gold">{stats.tournaments.active}</div>
          <div className="stat-label">Активных сейчас</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-accent-green">{stats.players.total}</div>
          <div className="stat-label">Игроков в БД</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-value text-sm text-text-primary">{stats.players.participants}</div>
          <div className="stat-label">Всего участий</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-sm text-text-primary">{stats.rounds}</div>
          <div className="stat-label">Раундов сыграно</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-sm text-accent-primary">{stats.tournaments.my}</div>
          <div className="stat-label">Моих турниров</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-sm text-text-primary">
            {stats.lastTournament ? '✓' : '—'}
          </div>
          <div className="stat-label">Последний завершён</div>
        </div>
      </div>

      {/* Last tournament */}
      {stats.lastTournament && (
        <div className="dark-panel p-6">
          <h2 className="heading-label mb-4">Последний завершённый турнир</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-primary font-heading font-bold text-lg">{stats.lastTournament.name}</p>
              <p className="text-text-muted text-sm mt-1">
                {stats.lastTournament.mode === '1x1' ? '1×1' : '2×2'}
                {' · '}
                {stats.lastTournament.organizer_name || 'Неизвестный организатор'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-text-muted text-xs">
                {stats.lastTournament.completed_at
                  ? new Date(stats.lastTournament.completed_at).toLocaleDateString('ru-RU')
                  : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
