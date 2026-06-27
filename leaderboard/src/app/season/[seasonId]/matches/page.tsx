// Season Match History page — all completed matches with winners
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { DarkPanel } from '@/components/DarkPanel';
import { getMatches, getSeason } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Props {
  params: Promise<{ seasonId: string }>;
}

export const revalidate = 120;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seasonId } = await params;
  const data = await getSeason(seasonId);
  const name = data?.season.name || 'Сезон';
  return {
    title: `История матчей — ${name}`,
    description: `Все завершённые матчи сезона «${name}». Победители, участники, даты.`,
  };
}

export default async function MatchesPage({ params }: Props) {
  const { seasonId } = await params;
  const [matches, seasonData] = await Promise.all([
    getMatches(seasonId),
    getSeason(seasonId),
  ]);
  if (!seasonData) notFound();

  const { season } = seasonData;

  return (
    <main className="flex-1">
      <PageHeader
        title={`История матчей — ${season.name}`}
        subtitle={`${matches.length} завершённых турниров`}
        backHref={`/season/${seasonId}`}
        backLabel="К сезону"
      />

      <section className="max-w-4xl mx-auto px-4 pb-16">
        {matches.length === 0 ? (
          <DarkPanel className="text-center py-12">
            <p className="text-text-muted">Нет завершённых матчей в этом сезоне.</p>
          </DarkPanel>
        ) : (
          <div className="flex flex-col gap-4">
            {matches.map((m) => (
              <DarkPanel key={m.id} className="p-5">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <Link
                      href={`/standings/${m.id}`}
                      className="font-heading font-bold text-text-primary hover:text-accent-cyan crt-glow-cyan transition-colors"
                    >
                      {m.name}
                    </Link>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-text-muted">
                        {m.mode}
                      </span>
                      <span className="text-xs text-text-muted">
                        {m.total_rounds} раундов
                      </span>
                      <span className="text-xs text-text-muted">
                        {m.participants_count} участников
                      </span>
                      {m.organizer_name && (
                        <span className="text-xs text-accent-magenta">
                          @{m.organizer_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {m.winner ? (
                      <>
                        <div className="font-heading font-bold text-accent-gold text-sm">
                          🏆 {m.winner.name}
                        </div>
                        <div className="text-xs text-text-muted">
                          {m.winner.total_points} очков
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                    <div className="text-[10px] text-text-muted mt-1">
                      {m.completed_at ? formatDate(m.completed_at) : ''}
                    </div>
                  </div>
                </div>
              </DarkPanel>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
