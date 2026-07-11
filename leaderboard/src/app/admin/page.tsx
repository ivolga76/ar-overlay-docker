import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminStats } from '@/lib/api';

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) redirect('/admin/login');

  let stats;
  try { stats = await getAdminStats(token); } catch { stats = null; }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-[#8b867b]">Не удалось загрузить статистику. Проверьте подключение к API.</p>
      </div>
    );
  }

  const statCard = 'text-center p-4 rounded-lg bg-[rgba(12,13,17,0.86)] border border-[rgba(234,224,205,0.08)]';
  const statValue = 'font-mono font-bold text-2xl';
  const statLabel = 'font-heading text-[0.6rem] uppercase tracking-[0.12em] text-[#8b867b] mt-1';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-heading font-bold text-lg uppercase tracking-[0.04em] text-[#eae0cd]">Дашборд</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={statCard}>
          <div className={`${statValue} text-[#00e5ff]`}>{stats.seasons.total}</div>
          <div className={statLabel}>Сезонов ({stats.seasons.active} активно)</div>
        </div>
        <div className={statCard}>
          <div className={`${statValue} text-[#00e5ff]`}>{stats.tournaments.total}</div>
          <div className={statLabel}>Турниров ({stats.tournaments.completed} завершено)</div>
        </div>
        <div className={statCard}>
          <div className={`${statValue} text-[#ffb800]`}>{stats.tournaments.active}</div>
          <div className={statLabel}>Активных сейчас</div>
        </div>
        <div className={statCard}>
          <div className={`${statValue} text-[#22c55e]`}>{stats.players.total}</div>
          <div className={statLabel}>Игроков в БД</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={statCard}>
          <div className="text-sm text-[#eae0cd] font-mono font-bold">{stats.players.participants}</div>
          <div className={statLabel}>Всего участий</div>
        </div>
        <div className={statCard}>
          <div className="text-sm text-[#eae0cd] font-mono font-bold">{stats.rounds}</div>
          <div className={statLabel}>Раундов сыграно</div>
        </div>
        <div className={statCard}>
          <div className="text-sm text-[#00e5ff] font-mono font-bold">{stats.tournaments.my}</div>
          <div className={statLabel}>Моих турниров</div>
        </div>
        <div className={statCard}>
          <div className="text-sm text-[#eae0cd] font-mono font-bold">{stats.lastTournament ? '✓' : '—'}</div>
          <div className={statLabel}>Последний завершён</div>
        </div>
      </div>

      {stats.lastTournament && (
        <div className="bg-[rgba(12,13,17,0.86)] border border-[rgba(234,224,205,0.12)] rounded-lg shadow-[0_20px_70px_rgba(0,0,0,0.32)] p-6">
          <h2 className="font-heading font-bold text-lg uppercase tracking-[0.04em] text-[#eae0cd] mb-4">Последний завершённый турнир</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#eae0cd] font-heading font-bold text-lg">{stats.lastTournament.name}</p>
              <p className="text-[#8b867b] text-sm mt-1">
                {stats.lastTournament.mode === '1x1' ? '1×1' : '2×2'}
                {' · '}
                {stats.lastTournament.organizer_name || 'Неизвестный организатор'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[#8b867b] text-xs">
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
