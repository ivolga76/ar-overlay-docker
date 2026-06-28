// ARC Raiders Tournament — TypeScript types

export type TournamentMode = '1x1' | '2x2';
export type TournamentStatus = 'draft' | 'active' | 'completed';

/** Raw API response from /api/leaderboard */
export interface LeaderboardEntry {
  participant_id: string;
  participant_name: string;
  participant_type: 'player' | 'team';
  tournament_id: string;
  tournament_name: string;
  tournament_mode: TournamentMode;
  total_points: number;
  tournament_rank: number;
  organizer_name: string | null;
}

/** Enriched standings entry matching the Google Sheets format */
export interface StandingEntry {
  rank: number;
  nickname: string;
  participantId: string;
  mmr: number;
  wins: number;
  losses: number;
  totalPoints: number;
  tournamentName: string;
  tournamentId: string;
  mode: TournamentMode;
  isTeam: boolean;
  organizerName: string | null;
}

/** Tournament detail from /api/tournaments/:id */
export interface TournamentDetail {
  id: string;
  user_id: string;
  season_id: string | null;
  season_name?: string;
  name: string;
  mode: TournamentMode;
  status: TournamentStatus;
  total_rounds: number;
  created_at: string;
  completed_at: string | null;
  organizer_name?: string;
}

// ── Season 2 types ───────────────────────────────────────

export interface Season {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface SeasonDetail {
  season: Season;
  stats: {
    tournaments_total: number;
    tournaments_completed: number;
  };
}

export interface Contract {
  id: string;
  season_id: string;
  category: 'pve' | 'pvp' | 'pvpve' | 'boosty';
  text: string;
  points: number;
  is_legendary: number;
  boosty_author: string | null;
  completed_by: string | null;
  completed_at: string | null;
  sort_order: number;
}

export interface Protocol {
  id: string;
  season_id: string;
  text: string;
  penalty_seconds: number;
  boosty_author: string | null;
  sort_order: number;
}

export interface RoundContract {
  id: string;
  round_result_id: string;
  contract_id: string;
  participant_id: string;
  completed: number;
  completed_by_opponent: number;
  points_earned: number;
  contract_text?: string;
  category?: string;
  contract_points?: number;
}

export interface RoundProtocol {
  id: string;
  round_result_id: string;
  protocol_id: string;
  participant_id: string;
  violated: number;
  protocol_text?: string;
  penalty_seconds?: number;
}

export interface MatchEntry {
  id: string;
  name: string;
  mode: TournamentMode;
  completed_at: string;
  total_rounds: number;
  organizer_name: string | null;
  winner: { name: string; total_points: number } | null;
  participants_count: number;
}

export interface TeamRoster {
  id: string;
  name: string;
  tournament_name: string;
  tournament_id: string;
  members: { name: string }[];
  total_points: number;
  rank: number | null;
}

export interface SeasonRating {
  rank: number;
  participant_name: string;
  participant_type: 'player' | 'team';
  tournaments_played: number;
  wins: number;
  losses: number;
  total_points: number;
  best_score: number;
  mmr: number;
}

/** Player stats from /api/players/:id */
export interface PlayerStats {
  playerId: string;
  nickname: string;
  totalTournaments: number;
  totalWins: number;
  totalLosses: number;
  peakMmr: number;
  currentMmr: number;
  history: PlayerTournamentEntry[];
}

export interface PlayerTournamentEntry {
  tournamentId: string;
  tournamentName: string;
  mode: TournamentMode;
  rank: number;
  mmr: number;
  wins: number;
  losses: number;
  completedAt: string | null;
}

/** API error */
export interface ApiError {
  error: string;
}
