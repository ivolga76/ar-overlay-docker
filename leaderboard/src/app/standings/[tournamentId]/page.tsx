// Tournament Standings Detail — per-tournament leaderboard
// V2: matches new dark/cream/cyan design

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { StandingsTable } from '@/components/StandingsTable';
import { PageHeader } from '@/components/PageHeader';
import { getTournamentStandings, getTournament } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Props { params: Promise<{ tournamentId: string }> }
export const revalidate = 30;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tournamentId } = await params;
  const tournament = await getTournament(tournamentId);
  if (!tournament) return { title: 'Турнир не найден' };
  return {
    title: `${tournament.name} — AR Overlay`,
    description: `Турнирная таблица «${tournament.name}» (${tournament.mode}).`,
    openGraph: { title: `${tournament.name} — Битва за Респект`, description: 'Турнирная таблица сообщества Arc Raiders' },
  };
}

export default async function TournamentStandingsPage({ params }: Props) {
  const { tournamentId } = await params;
  const [tournament, entries] = await Promise.all([getTournament(tournamentId), getTournamentStandings(tournamentId)]);
  if (!tournament) notFound();

  return (
    <main className="flex-1">
      <PageHeader
        title={tournament.name}
        subtitle={`Режим: ${tournament.mode === '1x1' ? '1×1' : '2×2'} · Раундов: ${tournament.total_rounds}${tournament.season_name ? ` · ${tournament.season_name}` : ''}${tournament.completed_at ? ` · Завершён: ${formatDate(tournament.completed_at)}` : ''}`}
        backHref="/standings"
        backLabel="К общему рейтингу"
      />

      <StandingsTable
        title="Турнирная таблица"
        subtitle={entries.length > 0 ? `${entries.length} участников` : 'Участники не найдены'}
        entries={entries}
        lastUpdated={tournament.completed_at ? formatDate(tournament.completed_at) : undefined}
      />
    </main>
  );
}
