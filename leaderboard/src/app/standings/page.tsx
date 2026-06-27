// Global Standings page — all completed tournaments leaderboard
// ISR revalidated every 60 seconds
// Supports season and mode filters via searchParams

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
  searchParams: Promise<{ season?: string; mode?: string }>;
}

export default async function StandingsPage({ searchParams }: Props) {
  const { season, mode } = await searchParams;
  const [entries, seasons] = await Promise.all([
    getGlobalLeaderboard(100, mode || undefined, season || undefined),
    getSeasons(),
  ]);

  const activeSeasonId = season || (seasons.length > 0 ? seasons[seasons.length - 1].id : null);
  const activeSeasonName = seasons.find((s) => s.id === activeSeasonId)?.name || 'Все сезоны';

  const stats = {
    totalPlayers: new Set(entries.map((e) => e.nickname)).size,
    totalTournaments: new Set(entries.map((e) => e.tournamentId)).size,
    topMmr: entries.length > 0 ? Math.max(...entries.map((e) => e.mmr)) : 0,
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
            <span className="mono-stat text-xl text-accent-magenta font-bold">
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
            <a
              href="/standings"
              className={`text-xs px-3 py-1 rounded transition-colors ${
                !season ? 'bg-accent-cyan text-bg-primary font-bold' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Все сезоны
            </a>
            {seasons.map((s) => (
              <a
                key={s.id}
                href={`/standings?season=${s.id}`}
                className={`text-xs px-3 py-1 rounded transition-colors ${
                  season === s.id ? 'bg-accent-cyan text-bg-primary font-bold' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {s.name}
              </a>
            ))}
          </div>
        )}
      </div>

      <StandingsTable
        title={activeSeasonId ? `${activeSeasonName}` : 'Глобальный рейтинг'}
        subtitle={`${stats.totalPlayers} игроков из ${stats.totalTournaments} завершённых турниров. MMR рассчитывается по очкам, победам и поражениям.`}
        entries={entries}
        lastUpdated={formatDate(new Date().toISOString())}
      />
    </main>
  );
}
