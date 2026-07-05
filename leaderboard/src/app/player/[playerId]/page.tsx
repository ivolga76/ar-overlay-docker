// Player stats page — detailed performance for a single player
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
  const createdAt = stats.createdAt ?? null;
  const playerType = stats.playerType ?? null;
  const mmrHistory = stats.mmrHistory ?? [];

  const mmr = formatMmr(currentMmr);
  const peak = formatMmr(peakMmr);
  const winRate =
    totalWins + totalLosses > 0
      ? Math.round((totalWins / (totalWins + totalLosses)) * 100)
      : 0;

  // Best rank from history
  const bestRank =
    stats.history && stats.history.length > 0
      ? Math.min(...stats.history.map((h) => h.rank))
      : null;

  // Player type label
  const typeLabel =
    playerType === 'pvp' ? 'PvP' :
    playerType === 'pve' ? 'PvE' :
    playerType === 'pvpve' ? 'PvPvE' :
    null;

  return (
    <main className="flex-1">
      <PageHeader
        title={stats.nickname}
        subtitle="Детальная статистика игрока"
        backHref="/standings"
        backLabel="К рейтингу"
      />

      {/* ════════════ Meta Row: Registration + Type ════════════ */}
      <section className="max-w-4xl mx-auto px-4 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          {createdAt && (
            <span className="text-xs text-text-muted tracking-wider uppercase">
              Игрок с{' '}
              <time dateTime={createdAt} className="text-text-primary font-heading font-bold">
                {formatDate(createdAt)}
              </time>
            </span>
          )}
          {typeLabel && (
            <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[rgba(255,184,0,0.12)] text-accent-gold font-heading font-bold">
              {typeLabel}
            </span>
          )}
        </div>
      </section>

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
            value={bestRank ? `#${bestRank}` : '—'}
            colorClass="text-accent-gold"
          />
        </div>
      </section>

      {/* ════════════ MMR Chart ════════════ */}
      {mmrHistory.length >= 2 && (
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <div className="flex items-center gap-3 mb-4">
            <hr className="neon-divider flex-1" />
            <h2 className="heading-section flex-shrink-0">Динамика MMR</h2>
            <hr className="neon-divider flex-1" />
          </div>
          <DarkPanel className="p-5">
            <MmrSparkline history={mmrHistory} />
          </DarkPanel>
        </section>
      )}

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

/** SVG sparkline chart for MMR progression */
function MmrSparkline({ history }: { history: MMRHistoryEntry[] }) {
  if (history.length < 2) return null;

  const width = 700;
  const height = 160;
  const padding = { top: 20, right: 16, bottom: 28, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = history.map((h) => h.mmr);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1; // avoid division by zero

  // Y scale: min at bottom, max at top, with 5% padding
  const yPad = range * 0.08;
  const yMin = minVal - yPad;
  const yMax = maxVal + yPad;
  const yRange = yMax - yMin || 1;
  const scaleY = (v: number) =>
    padding.top + chartH - ((v - yMin) / yRange) * chartH;

  // X scale
  const scaleX = (i: number) =>
    padding.left + (i / (history.length - 1)) * chartW;

  // Build path
  const points = history.map((h, i) => `${scaleX(i)},${scaleY(h.mmr)}`);
  const linePath = points.join(' L ');

  // Area fill under the line
  const areaPath = `M ${scaleX(0)},${padding.top + chartH} L ${linePath} L ${scaleX(history.length - 1)},${padding.top + chartH} Z`;

  // Y-axis labels (min, mid, max)
  const yTicks = [yMax, (yMax + yMin) / 2, yMin].map((v) => Math.round(v));

  // X-axis labels: first, middle, last date
  const dateTicks = [
    { i: 0, label: formatShortDate(history[0].date) },
    {
      i: Math.floor((history.length - 1) / 2),
      label: formatShortDate(history[Math.floor((history.length - 1) / 2)].date),
    },
    { i: history.length - 1, label: formatShortDate(history[history.length - 1].date) },
  ];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      style={{ maxHeight: '180px' }}
      role="img"
      aria-label="График изменения MMR"
    >
      {/* Grid lines */}
      {yTicks.map((v, i) => (
        <g key={`grid-${i}`}>
          <line
            x1={padding.left}
            y1={scaleY(v)}
            x2={width - padding.right}
            y2={scaleY(v)}
            stroke="rgba(234,224,205,0.06)"
            strokeWidth="1"
          />
          <text
            x={width - padding.right + 2}
            y={scaleY(v) + 3}
            fill="rgba(234,224,205,0.4)"
            fontSize="9"
            fontFamily="monospace"
            textAnchor="start"
          >
            {v}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path
        d={areaPath}
        fill="url(#mmrGradient)"
        opacity="0.3"
      />

      {/* Line */}
      <path
        d={`M ${linePath}`}
        fill="none"
        stroke="url(#mmrLineGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {history.map((h, i) => (
        <circle
          key={i}
          cx={scaleX(i)}
          cy={scaleY(h.mmr)}
          r="3"
          fill="#00ffff"
          stroke="#0a0a0f"
          strokeWidth="1.5"
        >
          <title>
            {h.tournamentName}: {h.mmr} MMR ({formatShortDate(h.date)})
          </title>
        </circle>
      ))}

      {/* X-axis date labels */}
      {dateTicks.map((dt) => (
        <text
          key={dt.i}
          x={scaleX(dt.i)}
          y={height - 4}
          fill="rgba(234,224,205,0.35)"
          fontSize="9"
          fontFamily="monospace"
          textAnchor={dt.i === 0 ? 'start' : dt.i === history.length - 1 ? 'end' : 'middle'}
        >
          {dt.label}
        </text>
      ))}

      {/* Gradients */}
      <defs>
        <linearGradient id="mmrGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00ffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00ffff" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="mmrLineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00ffff" />
          <stop offset="100%" stopColor="#ff00ff" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Short date format: DD.MM */
function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  } catch {
    return dateStr;
  }
}
