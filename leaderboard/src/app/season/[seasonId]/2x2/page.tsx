// Season 2×2 Ratings page
// Enhanced: animated RatingsTable with medal entrances

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
    title: `Рейтинг 2×2 — ${name}`,
    description: `Рейтинг команд 2×2 в сезоне «${name}». MMR, победы, поражения, лучший результат.`,
  };
}

export default async function Ratings2x2Page({ params }: Props) {
  const { seasonId } = await params;
  const [ratings, seasonData] = await Promise.all([
    getRatings(seasonId, '2x2'),
    getSeason(seasonId),
  ]);
  if (!seasonData) notFound();

  const { season } = seasonData;

  return (
    <main className="flex-1">
      <PageHeader
        title={`Рейтинг 2×2 — ${season.name}`}
        subtitle={`${ratings.length} команд. MMR = 1000 + очки×3 + победы×15 − поражения×5`}
        backHref={`/season/${seasonId}`}
        backLabel="К сезону"
      />

      <section className="max-w-4xl mx-auto px-4 pb-16">
        <ScrollReveal direction="up" staggerDelay={30}>
          <RatingsTable
            ratings={ratings}
            emptyMessage="Нет завершённых турниров 2×2 в этом сезоне."
          />
        </ScrollReveal>
      </section>
    </main>
  );
}
