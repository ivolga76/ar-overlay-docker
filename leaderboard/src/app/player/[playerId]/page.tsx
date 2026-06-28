// Player stats page — detailed performance for a single player
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { DarkPanel } from '@/components/DarkPanel';
import { getPlayerStats } from '@/lib/api';
import { formatMmr, formatDate } from '@/lib/utils';

export const dynamic = 'force-static';
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ playerId: string }>;
}): Promise<Metadata> {
  const { playerId } = await params;
  const stats = await getPlayerStats(playerId);
  if (!stats) return { title: 'Игрок не найден' };
  return { title: `${stats.nickname} — Статистика` };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const stats = await getPlayerStats(playerId);

  if (!stats) notFound();

  const currentMmr = stats.currentMmr ?? 1000;
  const peakMmr = stats.peakMmr ?? 1000;
  const totalWins = stats.totalWins ?? 0;
  const totalLosses = stats.totalLosses ?? 0;

  const mmr = formatMmr(currentMmr);
  const peak = formatMmr(peakMmr);
  const winRate =
    totalWins + totalLosses > 0
      ? Math.round((totalWins / (totalWins + totalLosses)) * 100)
      : 0;

  return (
    <main className="flex-1">
      <PageHeader
        title={stats.nickname}
        subtitle="Детальная статистика игрока"
        backHref="/standings"
        backLabel="К рейтингу"
      />

      {/* ════════════ Summary Cards ════════════ */}
      <section className="max-w-4xl mx-auto px-4 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Текущий MMR" value={mmr.value} colorClass={mmr.colorClass} />
          <StatCard label="Пиковый MMR" value={peak.value} colorClass={peak.colorClass} />
          <StatCard label="Побед / Поражений" value={`${totalWins}W / ${totalLosses}L`} colorClass="text-text-primary" />
          <StatCard label="Win Rate" value={`${winRate}%`} colorClass={winRate >= 50 ? 'text-accent-cyan' : 'text-danger'} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <StatCard label="Всего турниров" value={String(stats.totalTournaments ?? 0)} colorClass="text-text-primary" />
          <StatCard
            label="Лучший результат"
            value={stats.history && stats.history.length > 0 ? `#${Math.min(...stats.history.map((h) => h.rank))}` : '—'}
            colorClass="text-accent-gold"
          />
        </div>
      </section>

      {/* ════════════ Tournament History ════════════ */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <hr className="neon-divider flex-1" />
          <h2 className="heading-section flex-shrink-0">История турниров</h2>
          <hr className="neon-divider flex-1" />
        </div>

        {!stats.history || stats.history.length === 0 ? (
          <DarkPanel className="text-center py-12">
            <p className="text-text-muted">Нет завершённых турниров.</p>
          </DarkPanel>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-[10px] uppercase tracking-wider border-b border-[rgba(234,224,205,0.06)]">
                  <th className="text-left py-3 px-4">Турнир</th>
                  <th className="text-center py-3 px-4">Режим</th>
                  <th className="text-right py-3 px-4">Место</th>
                  <th className="text-right py-3 px-4">MMR</th>
                  <th className="text-right py-3 px-4">W/L</th>
                  <th className="text-right py-3 px-4">Дата</th>
                </tr>
              </thead>
              <tbody>
                {stats.history.map((entry) => {
                  const entryMmr = entry.mmr ?? 0;
                  const entryWins = entry.wins ?? 0;
                  const entryLosses = entry.losses ?? 0;
                  const hMmr = formatMmr(entryMmr);
                  return (
                    <tr
                      key={entry.tournamentId}
                      className="border-b border-[rgba(234,224,205,0.03)] hover:bg-[rgba(0,255,255,0.02)] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/standings/${entry.tournamentId}`}
                          className="font-heading font-bold text-text-primary hover:text-accent-cyan transition-colors"
                        >
                          {entry.tournamentName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(0,255,255,0.1)] text-accent-cyan font-heading font-bold">
                          {entry.mode === '1x1' ? '1×1' : '2×2'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-heading font-bold text-sm ${
                          entry.rank === 1 ? 'text-accent-gold crt-glow-gold' :
                          entry.rank <= 3 ? 'text-accent-cyan' : 'text-text-muted'
                        }`}>
                          #{entry.rank}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right mono-stat font-bold ${hMmr.colorClass}`}>
                        {hMmr.value}
                      </td>
                      <td className="py-3 px-4 text-right mono-stat text-sm">
                        <span className="text-success">{entryWins}W</span>
                        <span className="text-text-muted mx-1">/</span>
                        <span className="text-danger">{entryLosses}L</span>
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-text-muted">
                        {formatDate(entry.completedAt ?? null)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

/** Small stat card for summary grid */
function StatCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <DarkPanel className="p-5 text-center">
      <p className={`mono-stat text-2xl font-bold ${colorClass}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-text-muted mt-2">{label}</p>
    </DarkPanel>
  );
}
