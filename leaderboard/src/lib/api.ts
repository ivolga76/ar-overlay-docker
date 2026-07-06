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
// MMR now comes from the server (Elo system), no client-side computation needed

function getApiBase(): string {
  // Server-side: use env var (Docker: http://app:3001, dev: http://localhost:3001)
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? 'http://localhost:3001';
  }
  // Client-side: same host as leaderboard, port 3001
  return `http://${window.location.hostname}:3001`;
}

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getApiBase()}${path}`;
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

export async function getSeasons(status?: 'active' | 'archived'): Promise<Season[]> {
  const qs = status ? `?status=${status}` : '';
  const data = await fetchAPISafe<{ seasons: Season[] }>(
    `/api/seasons${qs}`,
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

// ── Admin (cookie-based auth) ─────────────────────────────

async function fetchAdmin<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const url = `${getApiBase()}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error ${res.status}`);
  }
  return res.json();
}

export async function getAdminStats(token: string) {
  return fetchAdmin<any>('/api/admin/stats', token, { next: { revalidate: 0 } });
}

export async function getAdminPlayers(token: string, search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return fetchAdmin<{ players: any[]; total: number }>(`/api/players${params}`, token);
}

export async function updatePlayer(id: string, fields: Record<string, any>, token: string) {
  return fetchAdmin<any>(`/api/players/${id}`, token, { method: 'PUT', body: JSON.stringify(fields) });
}

export async function updateRound(id: string, fields: Record<string, any>, token: string) {
  return fetchAdmin<any>(`/api/rounds/${id}`, token, { method: 'PUT', body: JSON.stringify(fields) });
}

export async function updateParticipant(id: string, fields: Record<string, any>, token: string) {
  return fetchAdmin<any>(`/api/tournament-participants/${id}`, token, { method: 'PUT', body: JSON.stringify(fields) });
}

// ── Complications ────────────────────────────────────────────

export async function createComplication(tournamentId: string, text: string, token: string) {
  return fetchAdmin<any>(`/api/tournaments/${tournamentId}/complications`, token, { method: 'POST', body: JSON.stringify({ text }) });
}

export async function updateComplication(id: string, text: string, token: string) {
  return fetchAdmin<any>(`/api/complications/${id}`, token, { method: 'PUT', body: JSON.stringify({ text }) });
}

export async function deleteComplication(id: string, token: string) {
  return fetchAdmin<any>(`/api/complications/${id}`, token, { method: 'DELETE' });
}

// ── Bonus Tasks ──────────────────────────────────────────────

export async function createBonusTask(tournamentId: string, text: string, points: number, token: string) {
  return fetchAdmin<any>(`/api/tournaments/${tournamentId}/bonus-tasks`, token, { method: 'POST', body: JSON.stringify({ text, points }) });
}

export async function updateBonusTask(id: string, fields: Record<string, any>, token: string) {
  return fetchAdmin<any>(`/api/bonus-tasks/${id}`, token, { method: 'PUT', body: JSON.stringify(fields) });
}

export async function deleteBonusTask(id: string, token: string) {
  return fetchAdmin<any>(`/api/bonus-tasks/${id}`, token, { method: 'DELETE' });
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
      mmr?: number;
      season_id?: string | null;
    };
    const wins = raw.wins ?? 0;
    const losses = raw.losses ?? 0;
    const mmr = raw.mmr ?? 1000; // Real Elo from server

    return {
      rank: i + 1,
      nickname: entry.participant_name,
      participantId: entry.participant_id,
      mmr,
      wins,
      losses,
      totalPoints: entry.total_points,
      tournamentName: entry.tournament_name,
      tournamentId: entry.tournament_id,
      mode: entry.tournament_mode,
      seasonId: entry.season_id ?? null,
      isTeam: entry.participant_type === 'team',
      organizerName: entry.organizer_name,
    };
  });
}