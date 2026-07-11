import type { Metadata } from 'next';
import { StandingsTable } from '@/components/StandingsTable';
import { getGlobalLeaderboard, getSeasons } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Рейтинг — Битва за Респект',
  description:
    'Турнирная таблица ARC Raiders: сезонный рейтинг, MMR, режимы 1x1 и 2x2, легенды прошлых турниров.',
  openGraph: {
    title: 'Рейтинг — Битва за Респект',
    description: 'Турнирная таблица сообщества ARC Raiders',
  },
};

export const revalidate = 60;

interface Props {
  searchParams: Promise<{ season?: string }>;
}

export default async function StandingsPage({ searchParams }: Props) {
  const { season } = await searchParams;
  const seasons = await getSeasons();
  const activeSeasonId = season || (seasons.length > 0 ? seasons[seasons.length - 1].id : null);
  const activeSeasonName =
    seasons.find((s) => s.id === activeSeasonId)?.name || 'Текущий сезон';

  const [ratings1x1, ratings2x2, legendsEntries] = await Promise.all([
    getGlobalLeaderboard(200, '1x1', activeSeasonId ?? ''),
    getGlobalLeaderboard(200, '2x2', activeSeasonId ?? ''),
    getGlobalLeaderboard(200),
  ]);

  const entries = [...ratings1x1, ...ratings2x2, ...legendsEntries];
  const currentSeasonEntries = [...ratings1x1, ...ratings2x2].filter(
    (e) => e.seasonId === activeSeasonId,
  );

  const stats = {
    totalPlayers: new Set(currentSeasonEntries.map((e) => e.nickname)).size,
    totalTournaments: new Set(currentSeasonEntries.map((e) => e.tournamentId)).size,
    topMmr: currentSeasonEntries.length > 0
      ? Math.max(...currentSeasonEntries.map((e) => e.mmr))
      : 0,
  };

  return (
    <main className="flex-1">
      <section className="lb-standings-hero">
        <div>
          <p className="eyebrow">Respect index</p>
          <h1>Рейтинг рейдеров</h1>
          <p>
            Сезонная таблица для режима 1x1 и 2x2, плюс архивные вкладки
            легенд по всем завершённым турнирам.
          </p>
        </div>
        <dl className="lb-standings-stats">
          <div>
            <dt>Игроки</dt>
            <dd>{stats.totalPlayers}</dd>
          </div>
          <div>
            <dt>Турниры</dt>
            <dd>{stats.totalTournaments}</dd>
          </div>
          <div>
            <dt>Топ MMR</dt>
            <dd>{stats.topMmr}</dd>
          </div>
        </dl>
      </section>

      {seasons.length > 1 && (
        <nav className="lb-season-switch" aria-label="Выбор сезона">
          {seasons.map((s) => (
            <a
              key={s.id}
              href={`/standings?season=${s.id}`}
              className={s.id === activeSeasonId ? 'active' : ''}
            >
              {s.name}
            </a>
          ))}
        </nav>
      )}

      <StandingsTable
        title={activeSeasonName}
        subtitle={`${stats.totalPlayers} участников · ${stats.totalTournaments} турниров · обновление рейтинга через MMR`}
        entries={entries}
        lastUpdated={formatDate(new Date().toISOString())}
        activeSeasonId={activeSeasonId}
      />
    </main>
  );
}
