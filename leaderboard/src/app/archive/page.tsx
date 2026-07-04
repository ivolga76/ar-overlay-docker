// Archive page — archived seasons with full statistics
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { DarkPanel } from '@/components/DarkPanel';
import { getSeasons, getSeason } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Архив сезонов — AR Overlay',
  description: 'Архив завершённых сезонов турниров Arc Raiders — Битва за Респект.',
};

export const revalidate = 300;

export default async function ArchivePage() {
  const seasons = await getSeasons('archived');

  // Fetch stats for each archived season in parallel
  const seasonsWithStats = await Promise.all(
    seasons.map(async (s) => {
      const detail = await getSeason(s.id);
      return { season: s, stats: detail?.stats || null };
    })
  );

  return (
    <main className="flex-1">
      <PageHeader
        title="Архив сезонов"
        subtitle="Завершённые сезоны турниров. Полная статистика, рейтинги и история матчей."
        backHref="/"
        backLabel="На главную"
      />

      <section className="max-w-4xl mx-auto px-4 pb-20">
        {seasonsWithStats.length === 0 ? (
          <DarkPanel className="py-16 text-center">
            <p className="text-text-muted text-lg">Архивных сезонов пока нет</p>
            <p className="text-text-muted text-sm mt-2">Завершённые сезоны появятся здесь после архивации.</p>
          </DarkPanel>
        ) : (
          <div className="flex flex-col gap-6">
            {seasonsWithStats.map(({ season, stats }) => (
              <DarkPanel key={season.id} hoverable className="p-6">
                {/* Season header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="heading-label text-lg mb-1">{season.name}</h2>
                    {season.description && (
                      <p className="text-text-muted text-sm max-w-lg">{season.description}</p>
                    )}
                    <p className="text-xs text-text-muted mt-2">
                      {season.started_at && `Начат: ${formatDate(season.started_at)}`}
                      {season.ended_at && ` · Завершён: ${formatDate(season.ended_at)}`}
                    </p>
                  </div>
                  <span className="chip bg-[rgba(255,255,255,0.05)] text-text-muted text-xs">
                    Архив
                  </span>
                </div>

                {/* Stats bar */}
                {stats && (
                  <div className="flex flex-wrap gap-6 mb-5 p-4 bg-bg-primary/50 rounded-lg">
                    <div className="text-center">
                      <span className="mono-stat text-xl text-accent-cyan font-bold">
                        {stats.tournaments_total}
                      </span>
                      <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">
                        всего турниров
                      </p>
                    </div>
                    <div className="text-center">
                      <span className="mono-stat text-xl text-accent-gold font-bold">
                        {stats.tournaments_completed}
                      </span>
                      <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">
                        завершено
                      </p>
                    </div>
                    {stats.players_total !== undefined && (
                      <div className="text-center">
                        <span className="mono-stat text-xl text-accent-primary font-bold">
                          {stats.players_total}
                        </span>
                        <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">
                          игроков
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation links */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Link
                    href={`/season/${season.id}`}
                    className="dark-panel dark-panel-hover p-3 text-center text-sm font-heading font-bold text-text-primary hover:text-accent-primary transition-colors no-underline"
                  >
                    Обзор
                  </Link>
                  <Link
                    href={`/season/${season.id}/1x1`}
                    className="dark-panel dark-panel-hover p-3 text-center text-sm font-heading font-bold text-text-primary hover:text-accent-primary transition-colors no-underline"
                  >
                    1×1
                  </Link>
                  <Link
                    href={`/season/${season.id}/2x2`}
                    className="dark-panel dark-panel-hover p-3 text-center text-sm font-heading font-bold text-text-primary hover:text-accent-primary transition-colors no-underline"
                  >
                    2×2
                  </Link>
                  <Link
                    href={`/season/${season.id}/matches`}
                    className="dark-panel dark-panel-hover p-3 text-center text-sm font-heading font-bold text-text-primary hover:text-accent-primary transition-colors no-underline"
                  >
                    Матчи
                  </Link>
                </div>
              </DarkPanel>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
