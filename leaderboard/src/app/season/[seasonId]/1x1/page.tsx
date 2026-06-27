// Season 1×1 Ratings page
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { DarkPanel } from '@/components/DarkPanel';
import { getRatings, getSeason } from '@/lib/api';
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
    title: `Рейтинг 1×1 — ${name}`,
    description: `Рейтинг игроков 1×1 в сезоне «${name}». MMR, победы, поражения, лучший результат.`,
  };
}

export default async function Ratings1x1Page({ params }: Props) {
  const { seasonId } = await params;
  const [ratings, seasonData] = await Promise.all([
    getRatings(seasonId, '1x1'),
    getSeason(seasonId),
  ]);
  if (!seasonData) notFound();

  const { season } = seasonData;

  return (
    <main className="flex-1">
      <PageHeader
        title={`Рейтинг 1×1 — ${season.name}`}
        subtitle={`${ratings.length} участников. MMR = 1000 + очки×3 + победы×15 − поражения×5`}
        backHref={`/season/${seasonId}`}
        backLabel="К сезону"
      />

      <section className="max-w-4xl mx-auto px-4 pb-16">
        {ratings.length === 0 ? (
          <DarkPanel className="text-center py-12">
            <p className="text-text-muted">Нет завершённых турниров 1×1 в этом сезоне.</p>
          </DarkPanel>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-[10px] uppercase tracking-wider border-b border-[rgba(234,224,205,0.06)]">
                  <th className="text-left py-3 px-4">#</th>
                  <th className="text-left py-3 px-4">Игрок</th>
                  <th className="text-right py-3 px-4">MMR</th>
                  <th className="text-right py-3 px-4">Очки</th>
                  <th className="text-right py-3 px-4">W</th>
                  <th className="text-right py-3 px-4">L</th>
                  <th className="text-right py-3 px-4">Турниров</th>
                  <th className="text-right py-3 px-4">Лучший</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map((r) => (
                  <tr
                    key={r.participant_name}
                    className="border-b border-[rgba(234,224,205,0.03)] hover:bg-[rgba(0,255,255,0.02)] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className={`
                        font-heading font-bold text-sm
                        ${r.rank === 1 ? 'text-accent-gold crt-glow-gold' :
                          r.rank === 2 ? 'text-text-primary' :
                          r.rank === 3 ? 'text-accent-cyan' : 'text-text-muted'}
                      `}>
                        {r.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-heading font-bold text-text-primary">
                      {r.participant_name}
                    </td>
                    <td className="py-3 px-4 text-right mono-stat text-accent-magenta font-bold">
                      {r.mmr}
                    </td>
                    <td className="py-3 px-4 text-right mono-stat text-text-primary">
                      {r.total_points}
                    </td>
                    <td className="py-3 px-4 text-right mono-stat text-accent-green">
                      {r.wins}
                    </td>
                    <td className="py-3 px-4 text-right mono-stat text-accent-red">
                      {r.losses}
                    </td>
                    <td className="py-3 px-4 text-right mono-stat text-text-muted">
                      {r.tournaments_played}
                    </td>
                    <td className="py-3 px-4 text-right mono-stat text-accent-gold">
                      {r.best_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
