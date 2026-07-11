// Season Team Rosters page — all 2×2 teams with members and results
// V2: matches new dark/cream/cyan design
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { DarkPanel } from '@/components/DarkPanel';
import { getTeams, getSeason } from '@/lib/api';

interface Props { params: Promise<{ seasonId: string }> }
export const revalidate = 120;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seasonId } = await params;
  const data = await getSeason(seasonId);
  const name = data?.season.name || 'Сезон';
  return { title: `Составы команд 2×2 — ${name}`, description: `Все команды 2×2 сезона «${name}».` };
}

export default async function TeamsPage({ params }: Props) {
  const { seasonId } = await params;
  const [teams, seasonData] = await Promise.all([getTeams(seasonId), getSeason(seasonId)]);
  if (!seasonData) notFound();
  const { season } = seasonData;

  const grouped = new Map<string, typeof teams>();
  for (const t of teams) {
    const key = t.tournament_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(t);
  }

  return (
    <main className="flex-1">
      <PageHeader title={`Составы команд — ${season.name}`} subtitle={`${teams.length} команд в ${grouped.size} турнирах`} backHref={`/season/${seasonId}`} backLabel="К сезону" />

      <section className="max-w-4xl mx-auto px-4 pb-16">
        {teams.length === 0 ? (
          <DarkPanel className="text-center py-12">
            <p className="text-[#8b867b]">Нет команд 2×2 в этом сезоне.</p>
          </DarkPanel>
        ) : (
          <div className="flex flex-col gap-6">
            {[...grouped.entries()].map(([tournamentId, tournamentTeams]) => {
              const tourneyName = tournamentTeams[0]?.tournament_name || 'Турнир';
              return (
                <div key={tournamentId}>
                  <div className="flex items-center gap-3 mb-3">
                    <Link href={`/standings/${tournamentId}`} className="font-heading font-bold text-[#eae0cd] hover:text-[#00e5ff] text-sm transition-colors">
                      {tourneyName}
                    </Link>
                    <span className="text-[10px] text-[#8b867b]">{tournamentTeams.length} команд</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tournamentTeams.map((team) => (
                      <DarkPanel key={team.id} className="p-4">
                        <div className="font-heading font-bold text-[#eae0cd] text-sm mb-2">{team.name}</div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {team.members.map((m, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded bg-[rgba(0,229,255,0.08)] text-[#00e5ff]">{m.name}</span>
                          ))}
                        </div>
                        <div className="flex gap-4 text-xs text-[#8b867b]">
                          <span>Очки: <span className="text-[#ffb800]">{team.total_points}</span></span>
                          {team.rank && <span>Место: <span className="text-[#eae0cd]">#{team.rank}</span></span>}
                        </div>
                      </DarkPanel>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
