// ARC Raiders Tournament — API client
// Proxies requests to the Express backend (AR Overlay API)

import type {
  LeaderboardEntry,
  StandingEntry,
  TournamentDetail,
  Season,
  SeasonDetail,
  Contract,
  Protocol,
  MatchEntry,
  TeamRoster,
  SeasonRating,
  PlayerStats,
} from './types';
import { computeMmr } from './utils';

const API_BASE = process.env.API_URL ?? 'http://localhost:3001';

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 30 },
      ...options,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `API error ${res.status}`);
    }

    return res.json();
  } catch (error) {
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn(`[API] Fetch failed for ${path} (build-time, API unavailable):`, (error as Error).message);
    }
    throw error;
  }
}

async function fetchAPISafe<T>(path: string, fallback: T, options?: RequestInit): Promise<T> {
  try {
    return await fetchAPI<T>(path, options);
  } catch {
    return fallback;
  }
}

// ── Leaderboard ────────────────────────────────────────────

export async function getGlobalLeaderboard(
  limit = 100,
  mode?: string,
  seasonId?: string
): Promise<StandingEntry[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (mode && mode !== 'all') params.set('mode', mode);
  if (seasonId) params.set('season_id', seasonId);

  const data = await fetchAPISafe<{ leaderboard: LeaderboardEntry[] }>(
    `/api/leaderboard?${params}`,
    { leaderboard: [] }
  );

  return enrichStandings(data.leaderboard);
}

export async function getTournamentStandings(
  tournamentId: string
): Promise<StandingEntry[]> {
  const data = await fetchAPISafe<{
    standings: LeaderboardEntry[];
    tournament: TournamentDetail;
  }>(
    `/api/leaderboard/${tournamentId}`,
    { standings: [], tournament: null as unknown as TournamentDetail }
  );

  return enrichStandings(data.standings ?? []);
}

// ── Tournaments ────────────────────────────────────────────

export async function getTournaments(
  seasonId?: string
): Promise<TournamentDetail[]> {
  const params = seasonId ? `?season_id=${seasonId}` : '';
  const data = await fetchAPISafe<{ tournaments: TournamentDetail[] }>(
    `/api/tournaments${params}`,
    { tournaments: [] }
  );
  return data.tournaments ?? [];
}

export async function getTournament(
  id: string
): Promise<TournamentDetail | null> {
  try {
    return await fetchAPI<TournamentDetail>(`/api/tournaments/${id}`);
  } catch {
    return null;
  }
}

// ── Seasons ────────────────────────────────────────────────

export async function getSeasons(): Promise<Season[]> {
  const data = await fetchAPISafe<{ seasons: Season[] }>(
    '/api/seasons',
    { seasons: [] }
  );
  return data.seasons ?? [];
}

export async function getSeason(id: string): Promise<SeasonDetail | null> {
  try {
    return await fetchAPI<SeasonDetail>(`/api/seasons/${id}`);
  } catch {
    return null;
  }
}

// ── Contracts ──────────────────────────────────────────────

export async function getContracts(
  seasonId: string,
  category?: string,
  legendary?: boolean
): Promise<Contract[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (legendary !== undefined) params.set('legendary', legendary ? '1' : '0');

  const qs = params.toString();
  const data = await fetchAPISafe<{ contracts: Contract[] }>(
    `/api/seasons/${seasonId}/contracts${qs ? `?${qs}` : ''}`,
    { contracts: [] }
  );
  return data.contracts ?? [];
}

export async function getLegendaryContracts(
  seasonId: string
): Promise<Contract[]> {
  const data = await fetchAPISafe<{ legendary: Contract[] }>(
    `/api/seasons/${seasonId}/legendary`,
    { legendary: [] }
  );
  return data.legendary ?? [];
}

// ── Protocols ──────────────────────────────────────────────

export async function getProtocols(seasonId: string): Promise<Protocol[]> {
  const data = await fetchAPISafe<{ protocols: Protocol[] }>(
    `/api/seasons/${seasonId}/protocols`,
    { protocols: [] }
  );
  return data.protocols ?? [];
}

// ── Matches ────────────────────────────────────────────────

export async function getMatches(
  seasonId: string,
  mode?: string
): Promise<MatchEntry[]> {
  const params = mode ? `?mode=${mode}` : '';
  const data = await fetchAPISafe<{ matches: MatchEntry[] }>(
    `/api/seasons/${seasonId}/matches${params}`,
    { matches: [] }
  );
  return data.matches ?? [];
}

// ── Teams ──────────────────────────────────────────────────

export async function getTeams(seasonId: string): Promise<TeamRoster[]> {
  const data = await fetchAPISafe<{ teams: TeamRoster[] }>(
    `/api/seasons/${seasonId}/teams`,
    { teams: [] }
  );
  return data.teams ?? [];
}

// ── Ratings ────────────────────────────────────────────────

export async function getRatings(
  seasonId: string,
  mode: '1x1' | '2x2'
): Promise<SeasonRating[]> {
  const data = await fetchAPISafe<{ ratings: SeasonRating[] }>(
    `/api/seasons/${seasonId}/ratings/${mode}`,
    { ratings: [] }
  );
  return data.ratings ?? [];
}

// ── Player Profile ─────────────────────────────────────────

export async function getPlayerStats(
  playerId: string
): Promise<PlayerStats | null> {
  try {
    return await fetchAPI<PlayerStats>(`/api/players/${playerId}`);
  } catch {
    return null;
  }
}

// ── Helpers ────────────────────────────────────────────────

function enrichStandings(entries: LeaderboardEntry[]): StandingEntry[] {
  return entries.map((entry, i) => {
    const raw = entry as LeaderboardEntry & {
      wins?: number;
      losses?: number;
    };
    const wins = raw.wins ?? 0;
    const losses = raw.losses ?? 0;
    const mmr = computeMmr(entry.total_points, wins, losses);

    return {
      rank: i + 1,
      nickname: entry.participant_name,
      mmr,
      wins,
      losses,
      totalPoints: entry.total_points,
      tournamentName: entry.tournament_name,
      tournamentId: entry.tournament_id,
      mode: entry.tournament_mode,
      isTeam: entry.participant_type === 'team',
      organizerName: entry.organizer_name,
    };
  });
}
