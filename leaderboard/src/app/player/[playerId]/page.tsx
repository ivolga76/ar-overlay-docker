// Player stats page — detailed performance for a single player
// V2: matches new dark/cream/cyan design
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { DarkPanel } from '@/components/DarkPanel';
import { getPlayerStats } from '@/lib/api';
import { formatMmr, formatDate } from '@/lib/utils';
import type { MMRHistoryEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ playerId: string }> }): Promise<Metadata> {
  const { playerId } = await params;
  const stats = await getPlayerStats(playerId);
  if (!stats) return { title: 'Игрок не найден' };
  return { title: `${stats.nickname} — Статистика` };
}

function StatCard({ label, value, colorClass }: { label: string; value: string; colorClass: string }) {
  return (
    <div className="text-center p-4 rounded-lg bg-[rgba(12,13,17,0.86)] border border-[rgba(234,224,205,0.08)]">
      <span className={`font-mono font-bold text-2xl tabular-nums ${colorClass}`}>{value}</span>
      <p className="font-heading text-[0.6rem] uppercase tracking-[0.12em] text-[#8b867b] mt-1">{label}</p>
    </div>
  );
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  } catch { return ''; }
}

function MmrSparkline({ history }: { history: MMRHistoryEntry[] }) {
  if (history.length < 2) return null;

  const width = 600;
  const height = 160;
  const padding = { top: 16, right: 40, bottom: 20, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const mmrValues = history.map((h) => h.mmr);
  const yMin = Math.min(...mmrValues) - 20;
  const yMax = Math.max(...mmrValues) + 20;
  const yRange = yMax - yMin || 1;

  const scaleY = (v: number) => padding.top + chartH - ((v - yMin) / yRange) * chartH;
  const scaleX = (i: number) => padding.left + (i / (history.length - 1)) * chartW;

  const points = history.map((h, i) => `${scaleX(i)},${scaleY(h.mmr)}`);
  const linePath = points.join(' L ');
  const areaPath = `M ${scaleX(0)},${padding.top + chartH} L ${linePath} L ${scaleX(history.length - 1)},${padding.top + chartH} Z`;

  const yTicks = [yMax, (yMax + yMin) / 2, yMin].map((v) => Math.round(v));
  const dateTicks = [
    { i: 0, label: formatShortDate(history[0].date) },
    { i: Math.floor((history.length - 1) / 2), label: formatShortDate(history[Math.floor((history.length - 1) / 2)].date) },
    { i: history.length - 1, label: formatShortDate(history[history.length - 1].date) },
  ];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ maxHeight: '180px' }} role="img" aria-label="График изменения MMR">
      {yTicks.map((v, i) => (
        <g key={`grid-${i}`}>
          <line x1={padding.left} y1={scaleY(v)} x2={width - padding.right} y2={scaleY(v)} stroke="rgba(234,224,205,0.06)" strokeWidth="1" />
          <text x={width - padding.right + 2} y={scaleY(v) + 3} fill="rgba(234,224,205,0.4)" fontSize="9" fontFamily="monospace" textAnchor="start">{v}</text>
        </g>
      ))}
      <path d={areaPath} fill="url(#mmrGradient)" opacity="0.3" />
      <path d={`M ${linePath}`} fill="none" stroke="url(#mmrLineGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {history.map((h, i) => (
        <circle key={i} cx={scaleX(i)} cy={scaleY(h.mmr)} r="3" fill="#00e5ff" stroke="#0a0a0c" strokeWidth="1.5">
          <title>{h.tournamentName}: {h.mmr} MMR ({formatShortDate(h.date)})</title>
        </circle>
      ))}
      {dateTicks.map((dt) => (
        <text key={dt.i} x={scaleX(dt.i)} y={height - 4} fill="rgba(234,224,205,0.35)" fontSize="9" fontFamily="monospace" textAnchor={dt.i === 0 ? 'start' : dt.i === history.length - 1 ? 'end' : 'middle'}>{dt.label}</text>
      ))}
      <defs>
        <linearGradient id="mmrGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="mmrLineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="50%" stopColor="#ffb800" />
          <stop offset="100%" stopColor="#ff00ff" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default async function PlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const stats = await getPlayerStats(playerId);
  if (!stats) notFound();

  const currentMmr = stats.currentMmr ?? 1000;
  const peakMmr = stats.peakMmr ?? 1000;
  const totalWins = stats.totalWins ?? 0;
  const totalLosses = stats.totalLosses ?? 0;
  const createdAt = stats.createdAt ?? null;
  const playerType = stats.playerType ?? null;
  const mmrHistory = stats.mmrHistory ?? [];

  const mmr = formatMmr(currentMmr);
  const peak = formatMmr(peakMmr);
  const winRate = totalWins + totalLosses > 0 ? Math.round((totalWins / (totalWins + totalLosses)) * 100) : 0;

  const bestRank = stats.history && stats.history.length > 0 ? Math.min(...stats.history.map((h) => h.rank)) : null;

  const typeLabel = playerType === 'pvp' ? 'PvP' : playerType === 'pve' ? 'PvE' : playerType === 'pvpve' ? 'PvPvE' : null;

  const sectionDivider = 'flex items-center gap-3 mb-8';
  const dividerLine = 'flex-1 h-px border-0 bg-[linear-gradient(90deg,transparent,rgba(234,224,205,0.15),transparent)]';
  const sectionTitle = 'font-heading font-bold text-sm uppercase tracking-[0.04em] text-[#00e5ff] flex-shrink-0';

  return (
    <main className="flex-1">
      <PageHeader title={stats.nickname} subtitle="Детальная статистика игрока" backHref="/standings" backLabel="К рейтингу" />

      <section className="max-w-4xl mx-auto px-4 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          {createdAt && (
            <span className="text-xs text-[#8b867b] tracking-wider uppercase">
              Игрок с{' '}
              <time dateTime={createdAt} className="text-[#eae0cd] font-heading font-bold">{formatDate(createdAt)}</time>
            </span>
          )}
          {typeLabel && (
            <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[rgba(255,184,0,0.12)] text-[#ffb800] font-heading font-bold">{typeLabel}</span>
          )}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Текущий MMR" value={mmr.value} colorClass={mmr.colorClass} />
          <StatCard label="Пиковый MMR" value={peak.value} colorClass={peak.colorClass} />
          <StatCard label="Побед / Поражений" value={`${totalWins}W / ${totalLosses}L`} colorClass="text-[#eae0cd]" />
          <StatCard label="Win Rate" value={`${winRate}%`} colorClass={winRate >= 50 ? 'text-[#00e5ff]' : 'text-[#ef4444]'} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <StatCard label="Всего турниров" value={String(stats.totalTournaments ?? 0)} colorClass="text-[#eae0cd]" />
          <StatCard label="Лучший результат" value={bestRank ? `#${bestRank}` : '—'} colorClass="text-[#ffb800]"/>
        </div>
      </section>

      {mmrHistory.length >= 2 && (
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <div className={sectionDivider}>
            <hr className={dividerLine} />
            <h2 className={sectionTitle}>Динамика MMR</h2>
            <hr className={dividerLine} />
          </div>
          <DarkPanel className="p-5">
            <MmrSparkline history={mmrHistory} />
          </DarkPanel>
        </section>
      )}

      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className={sectionDivider}>
          <hr className={dividerLine} />
          <h2 className={sectionTitle}>История турниров</h2>
          <hr className={dividerLine} />
        </div>

        {!stats.history || stats.history.length === 0 ? (
          <DarkPanel className="text-center py-12">
            <p className="text-[#8b867b]">Нет завершённых турниров.</p>
          </DarkPanel>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#8b867b] text-[10px] uppercase tracking-wider border-b border-[rgba(234,224,205,0.06)]">
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
                    <tr key={entry.tournamentId} className="border-b border-[rgba(234,224,205,0.03)] hover:bg-[rgba(0,229,255,0.02)] transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/standings/${entry.tournamentId}`} className="font-heading font-bold text-[#eae0cd] hover:text-[#00e5ff] transition-colors">
                          {entry.tournamentName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(0,229,255,0.1)] text-[#00e5ff] font-heading font-bold">
                          {entry.mode === '1x1' ? '1×1' : '2×2'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-heading font-bold text-sm ${entry.rank === 1 ? 'text-[#ffb800] [text-shadow:0_0_8px_rgba(255,184,0,0.4)]' : entry.rank <= 3 ? 'text-[#00e5ff]' : 'text-[#8b867b]'}`}>
                          #{entry.rank}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${hMmr.colorClass}`}>{hMmr.value}</td>
                      <td className="py-3 px-4 text-right font-mono text-sm tabular-nums">
                        <span className="text-[#22c55e]">{entryWins}W</span>
                        <span className="text-[#8b867b] mx-1">/</span>
                        <span className="text-[#ef4444]">{entryLosses}L</span>
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-[#8b867b]">{formatDate(entry.completedAt ?? null)}</td>
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
