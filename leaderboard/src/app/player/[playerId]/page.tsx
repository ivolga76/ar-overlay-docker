// Player stats page — detailed performance for a single player
// V2: matches new dark/cream/cyan design
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { DarkPanel } from '@/components/DarkPanel';
import { getPlayerStats, getPlayerSheetMatches } from '@/lib/api';
import type { SheetMatch } from '@/lib/api';
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

/** Catmull-Rom → cubic Bézier spline through all data points. */
function buildSplinePath(
  pts: { x: number; y: number }[]
): string {
  const n = pts.length;
  if (n < 2) return '';
  if (n === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;

  // Compute tangents (Catmull-Rom: (P_{i+1} - P_{i-1}) / 6)
  const tangents: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      // First point: reflect P1-P0
      tangents.push({
        x: (pts[1].x - pts[0].x) / 3,
        y: (pts[1].y - pts[0].y) / 3,
      });
    } else if (i === n - 1) {
      // Last point: reflect P_{n-1}-P_{n-2}
      tangents.push({
        x: (pts[n - 1].x - pts[n - 2].x) / 3,
        y: (pts[n - 1].y - pts[n - 2].y) / 3,
      });
    } else {
      tangents.push({
        x: (pts[i + 1].x - pts[i - 1].x) / 6,
        y: (pts[i + 1].y - pts[i - 1].y) / 6,
      });
    }
  }

  // Build cubic Bézier segments: M P0 C cp1_0,cp2_0, P1 C cp1_1,cp2_1, P2 ...
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const cp1x = pts[i].x + tangents[i].x;
    const cp1y = pts[i].y + tangents[i].y;
    const cp2x = pts[i + 1].x - tangents[i + 1].x;
    const cp2y = pts[i + 1].y - tangents[i + 1].y;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
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

  const pts = history.map((h, i) => ({ x: scaleX(i), y: scaleY(h.mmr) }));
  const linePath = buildSplinePath(pts);
  const baseline = padding.top + chartH;
  const areaPath = `M ${pts[0].x},${baseline} ${linePath.slice(1)} L ${pts[pts.length - 1].x},${baseline} Z`;

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
      <path d={linePath} fill="none" stroke="url(#mmrLineGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

  // Sheet match history — fetched separately (independent of tournament participation)
  const sheetData = await getPlayerSheetMatches(playerId);
  const sheetMatches: SheetMatch[] = sheetData.matches ?? [];

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

  const isTeam = !!stats.teamMembers;

  return (
    <main className="flex-1">
      <PageHeader title={stats.nickname} subtitle={isTeam ? 'Статистика команды' : 'Детальная статистика игрока'} backHref="/standings" backLabel="К рейтингу" />

      {stats.teamMembers && (
        <section className="max-w-4xl mx-auto px-4 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-[#8b867b] tracking-wider uppercase">Состав команды:</span>
            <span className="text-sm font-heading font-bold text-[#00e5ff]">{stats.teamMembers.playerA}</span>
            <span className="text-[#8b867b]">/</span>
            <span className="text-sm font-heading font-bold text-[#ffb800]">{stats.teamMembers.playerB}</span>
          </div>
        </section>
      )}

      <section className="max-w-4xl mx-auto px-4 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          {createdAt && (
            <span className="text-xs text-[#8b867b] tracking-wider uppercase">
              {isTeam ? 'Команда с ' : 'Игрок с '}
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

      {/* Виджеты: карты и противники */}
      {sheetMatches.length > 0 && (() => {
        // Most frequent map
        const mapCount: Record<string, number> = {};
        for (const m of sheetMatches) {
          if (m.map_name) mapCount[m.map_name] = (mapCount[m.map_name] || 0) + 1;
        }
        const topMap = Object.entries(mapCount).sort((a, b) => b[1] - a[1])[0];

        // Most frequent opponent
        const oppCount: Record<string, number> = {};
        const nickLower = stats.nickname.toLowerCase();
        for (const m of sheetMatches) {
          const opp = (m.player_a || '').toLowerCase() === nickLower ? m.player_b :
                      (m.player_b || '').toLowerCase() === nickLower ? m.player_a : null;
          if (opp && opp.toLowerCase() !== nickLower) oppCount[opp] = (oppCount[opp] || 0) + 1;
        }
        const topOpp = Object.entries(oppCount).sort((a, b) => b[1] - a[1])[0];

        if (!topMap && !topOpp) return null;

        return (
          <section className="max-w-4xl mx-auto px-4 pb-20">
            <div className={sectionDivider}>
              <hr className={dividerLine} />
              <h2 className={sectionTitle}>Аналитика матчей</h2>
              <hr className={dividerLine} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topMap && (
                <DarkPanel className="p-5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[#8b867b] font-heading mb-2">Самая частая карта</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-heading font-bold text-[#eae0cd]">{topMap[0]}</span>
                    <span className="font-mono text-sm text-[#00e5ff]">{topMap[1]} матчей</span>
                  </div>
                  <div className="mt-3 space-y-1">
                    {Object.entries(mapCount).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([map, count]) => (
                      <div key={map} className="flex items-center gap-2 text-xs">
                        <span className="w-24 text-[#8b867b] truncate">{map || '—'}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-[#1a1d24] overflow-hidden">
                          <div className="h-full bg-[#00e5ff] rounded-full" style={{ width: `${(count / (topMap?.[1] || 1)) * 100}%` }} />
                        </div>
                        <span className="w-6 text-right font-mono text-[#8b867b]">{count}</span>
                      </div>
                    ))}
                  </div>
                </DarkPanel>
              )}
              {topOpp && (
                <DarkPanel className="p-5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[#8b867b] font-heading mb-2">Самый частый противник</p>
                  <div className="flex items-baseline gap-3">
                    <Link href={`/player/${encodeURIComponent(topOpp[0])}`} className="text-2xl font-heading font-bold text-[#eae0cd] hover:text-[#00e5ff] transition-colors">
                      {topOpp[0]}
                    </Link>
                    <span className="font-mono text-sm text-[#ff00ff]">{topOpp[1]} матчей</span>
                  </div>
                  <div className="mt-3 space-y-1">
                    {Object.entries(oppCount).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([opp, count]) => (
                      <div key={opp} className="flex items-center gap-2 text-xs">
                        <Link href={`/player/${encodeURIComponent(opp)}`} className="w-24 text-[#8b867b] hover:text-[#00e5ff] transition-colors truncate">
                          {opp}
                        </Link>
                        <div className="flex-1 h-1.5 rounded-full bg-[#1a1d24] overflow-hidden">
                          <div className="h-full bg-[#ff00ff] rounded-full" style={{ width: `${(count / (topOpp?.[1] || 1)) * 100}%` }} />
                        </div>
                        <span className="w-6 text-right font-mono text-[#8b867b]">{count}</span>
                      </div>
                    ))}
                  </div>
                </DarkPanel>
              )}
            </div>
          </section>
        );
      })()}

      {/* Sheet Match History */}
      {sheetMatches.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 pb-20">
          <div className={sectionDivider}>
            <hr className={dividerLine} />
            <h2 className={sectionTitle}>Матчи (Google Sheets)</h2>
            <hr className={dividerLine} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#8b867b] text-[10px] uppercase tracking-wider border-b border-[rgba(234,224,205,0.06)]">
                  <th className="text-left py-3 px-4">#</th>
                  <th className="text-left py-3 px-4">Дата</th>
                  <th className="text-left py-3 px-4">Формат</th>
                  <th className="text-left py-3 px-4">Игрок A</th>
                  <th className="text-left py-3 px-4">Игрок B</th>
                  <th className="text-left py-3 px-4">Победитель</th>
                  <th className="text-left py-3 px-4">Карта</th>
                </tr>
              </thead>
              <tbody>
                {sheetMatches.map((m) => (
                  <tr key={m.id} className="border-b border-[rgba(234,224,205,0.03)] hover:bg-[rgba(0,229,255,0.02)] transition-colors">
                    <td className="py-3 px-4 text-[#8b867b] font-mono text-xs">{m.match_number}</td>
                    <td className="py-3 px-4 text-[#8b867b] text-xs">{m.match_date || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-heading font-bold ${m.format === 'pvp' ? 'bg-[rgba(255,0,255,0.12)] text-[#ff00ff]' : 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff]'}`}>
                        {m.format.toUpperCase()}
                      </span>
                    </td>
                    <td className={`py-3 px-4 font-heading font-bold text-sm ${m.player_a === m.winner ? 'text-[#22c55e]' : 'text-[#eae0cd]'}`}>{m.player_a}</td>
                    <td className={`py-3 px-4 font-heading font-bold text-sm ${m.player_b === m.winner ? 'text-[#22c55e]' : 'text-[#eae0cd]'}`}>{m.player_b}</td>
                    <td className="py-3 px-4 font-heading font-bold text-xs text-[#ffb800]">{m.winner || '—'}</td>
                    <td className="py-3 px-4 text-xs text-[#8b867b]">{m.map_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
