// Global Standings page — all completed tournaments leaderboard
// ISR revalidated every 60 seconds
// Mode tabs (1x1, 2x2, Legends 1x1, Legends 2x2) filter client-side.
// Season filter switches the active season for the "1x1" / "2x2" tabs.

import type { Metadata } from 'next';
import { StandingsTable } from '@/components/StandingsTable';
import { getGlobalLeaderboard, getSeasons } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Глобальный рейтинг — AR Overlay',
  description: 'Турнирная таблица всех завершённых турниров Arc Raiders. MMR, победы, поражения.',
  openGraph: {
    title: 'Глобальный рейтинг — Битва за Респект',
    description: 'Турнирная таблица сообщества Arc Raiders',
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
  const activeSeasonName = seasons.find((s) => s.id === activeSeasonId)?.name || 'Текущий сезон';

  // Two data sources:
  // 1. ratings1x1/ratings2x2 — imported Google Sheets ratings for current season tabs
  // 2. legendsEntries — all completed tournament results for legends tabs
  const [ratings1x1, ratings2x2, legendsEntries] = await Promise.all([
    getGlobalLeaderboard(200, '1x1', activeSeasonId ?? ''),
    getGlobalLeaderboard(200, '2x2', activeSeasonId ?? ''),
    getGlobalLeaderboard(200),
  ]);
  const entries = [...ratings1x1, ...ratings2x2, ...legendsEntries];

  // Stats: use imported ratings for current season
  const currentSeasonEntries = [...ratings1x1, ...ratings2x2].filter((e) => e.seasonId === activeSeasonId);
  const stats = {
    totalPlayers: new Set(currentSeasonEntries.map((e) => e.nickname)).size,
    totalTournaments: new Set(currentSeasonEntries.map((e) => e.tournamentId)).size,
    topMmr: currentSeasonEntries.length > 0 ? Math.max(...currentSeasonEntries.map((e) => e.mmr)) : 0,
  };

  return (
    <main className="flex-1">
      {/* Stats bar above the table */}
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <div className="flex flex-wrap justify-center gap-8 py-4 mb-2">
          <div className="text-center">
            <span className="mono-stat text-xl text-accent-cyan font-bold">
              {stats.totalPlayers}
            </span>
            <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">
              игроков
            </p>
          </div>
          <div className="text-center">
            <span className="mono-stat text-xl text-accent-gold font-bold">
              {stats.totalTournaments}
            </span>
            <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">
              турниров
            </p>
          </div>
          <div className="text-center">
            <span className="mono-stat text-xl text-accent-primary font-bold">
              {stats.topMmr}
            </span>
            <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">
              топ MMR
            </p>
          </div>
        </div>

        {/* Season filter links */}
        {seasons.length > 1 && (
          <div className="flex justify-center gap-2 pb-4 flex-wrap">
            {seasons.map((s) => (
              <a
                key={s.id}
                href={`/standings?season=${s.id}`}
                className={`chip text-xs ${season === s.id ? 'season-tab active' : ''}`}
              >
                {s.name}
              </a>
            ))}
          </div>
        )}
      </div>

      <StandingsTable
        title={activeSeasonName}
        subtitle={`${stats.totalPlayers} игроков из ${stats.totalTournaments} завершённых турниров. MMR рассчитывается по очкам, победам и поражениям.`}
        entries={entries}
        lastUpdated={formatDate(new Date().toISOString())}
        activeSeasonId={activeSeasonId}
      />
    </main>
  );
}
