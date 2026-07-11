// Season overview page — shows description and links to ratings/matches/teams
// V2: matches new dark/cream/cyan design
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { DarkPanel } from '@/components/DarkPanel';
import { FeatureCard } from '@/components/FeatureCard';
import { getSeason } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Props { params: Promise<{ seasonId: string }> }
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seasonId } = await params;
  const data = await getSeason(seasonId);
  if (!data) return { title: 'Сезон не найден' };
  return { title: `${data.season.name} — AR Overlay`, description: data.season.description || `Турнирный сезон «${data.season.name}»` };
}

export default async function SeasonPage({ params }: Props) {
  const { seasonId } = await params;
  const data = await getSeason(seasonId);
  if (!data) notFound();
  const { season, stats } = data;

  const statClass = 'font-mono font-bold text-2xl tabular-nums';
  const labelClass = 'text-[10px] uppercase tracking-wider text-[#8b867b] mt-1 font-heading';

  return (
    <main className="flex-1">
      <PageHeader title={season.name} subtitle={season.description || undefined} backHref="/" backLabel="На главную" />

      <section className="max-w-4xl mx-auto px-4 pb-16">
        <DarkPanel className="mb-8">
          <div className="flex flex-wrap justify-center gap-8 py-4">
            <div className="text-center">
              <span className={`${statClass} text-[#00e5ff]`}>{stats.tournaments_total}</span>
              <p className={labelClass}>всего турниров</p>
            </div>
            <div className="text-center">
              <span className={`${statClass} text-[#ffb800]`}>{stats.tournaments_completed}</span>
              <p className={labelClass}>завершено</p>
            </div>
            <div className="text-center">
              <span className={`${statClass} ${season.status === 'active' ? 'text-[#22c55e]' : 'text-[#8b867b]'}`}>
                {season.status === 'active' ? 'АКТИВЕН' : 'АРХИВ'}
              </span>
              <p className={labelClass}>статус</p>
            </div>
          </div>
        </DarkPanel>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href={`/season/${seasonId}/1x1`}><FeatureCard title="Рейтинг 1×1" description="Индивидуальный рейтинг игроков в формате 1 на 1. MMR, победы, поражения." icon="" /></Link>
          <Link href={`/season/${seasonId}/2x2`}><FeatureCard title="Рейтинг 2×2" description="Командный рейтинг в формате 2 на 2. Кооперативные сражения." icon="" /></Link>
          <Link href={`/season/${seasonId}/matches`}><FeatureCard title="История матчей" description="Все завершённые матчи сезона. Победители, участники, даты." icon="" /></Link>
          <Link href={`/season/${seasonId}/teams`}><FeatureCard title="Составы команд" description="Все команды 2×2, участвовавшие в сезоне. Составы и результаты." icon="" /></Link>
        </div>

        {season.started_at && (
          <p className="text-center text-[#8b867b] text-xs mt-8">
            Сезон начался: {formatDate(season.started_at)}
            {season.ended_at && ` · Завершён: ${formatDate(season.ended_at)}`}
          </p>
        )}
      </section>
    </main>
  );
}
