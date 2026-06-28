// Season 1×1 Ratings page
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { RatingsTable } from '@/components/RatingsTable';
import { ScrollReveal } from '@/components/ScrollReveal';
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
        <ScrollReveal direction="up" staggerDelay={30}>
          <RatingsTable
            ratings={ratings}
            emptyMessage="Нет завершённых турниров 1×1 в этом сезоне."
          />
        </ScrollReveal>
      </section>
    </main>
  );
}
