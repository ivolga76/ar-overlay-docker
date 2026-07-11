// Archive page — archived seasons with full statistics
// V2: matches new dark/cream/cyan design
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

  const seasonsWithStats = await Promise.all(
    seasons.map(async (s) => {
      const detail = await getSeason(s.id);
      return { season: s, stats: detail?.stats || null };
    })
  );

  const linkClass = 'block p-3 text-center text-sm font-heading font-bold text-[#eae0cd] hover:text-[#00e5ff] no-underline bg-[rgba(234,224,205,0.03)] border border-[rgba(234,224,205,0.08)] rounded-md hover:border-[rgba(234,224,205,0.2)] transition-colors';

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
            <p className="text-[#8b867b] text-lg">Архивных сезонов пока нет</p>
            <p className="text-[#8b867b] text-sm mt-2">Завершённые сезоны появятся здесь после архивации.</p>
          </DarkPanel>
        ) : (
          <div className="flex flex-col gap-6">
            {seasonsWithStats.map(({ season, stats }) => (
              <DarkPanel key={season.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-heading font-bold text-lg uppercase tracking-[0.03em] text-[#eae0cd] mb-1">{season.name}</h2>
                    {season.description && (
                      <p className="text-[#8b867b] text-sm max-w-lg">{season.description}</p>
                    )}
                    <p className="text-xs text-[#8b867b] mt-2">
                      {season.started_at && `Начат: ${formatDate(season.started_at)}`}
                      {season.ended_at && ` · Завершён: ${formatDate(season.ended_at)}`}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[rgba(234,224,205,0.05)] text-[#8b867b] text-xs font-heading font-semibold uppercase tracking-[0.06em]">
                    Архив
                  </span>
                </div>

                {stats && (
                  <div className="flex flex-wrap gap-6 mb-5 p-4 bg-[rgba(0,0,0,0.2)] rounded-lg">
                    <div className="text-center">
                      <span className="font-mono font-bold text-xl tabular-nums text-[#00e5ff]">{stats.tournaments_total}</span>
                      <p className="text-[10px] uppercase tracking-wider text-[#8b867b] mt-1">всего турниров</p>
                    </div>
                    <div className="text-center">
                      <span className="font-mono font-bold text-xl tabular-nums text-[#ffb800]">{stats.tournaments_completed}</span>
                      <p className="text-[10px] uppercase tracking-wider text-[#8b867b] mt-1">завершено</p>
                    </div>
                    {stats.players_total !== undefined && (
                      <div className="text-center">
                        <span className="font-mono font-bold text-xl tabular-nums text-[#00e5ff]">{stats.players_total}</span>
                        <p className="text-[10px] uppercase tracking-wider text-[#8b867b] mt-1">игроков</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Link href={`/season/${season.id}`} className={linkClass}>Обзор</Link>
                  <Link href={`/season/${season.id}/1x1`} className={linkClass}>1×1</Link>
                  <Link href={`/season/${season.id}/2x2`} className={linkClass}>2×2</Link>
                  <Link href={`/season/${season.id}/matches`} className={linkClass}>Матчи</Link>
                </div>
              </DarkPanel>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
