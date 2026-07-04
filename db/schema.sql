-- AR Overlay — Database Schema
-- SQLite (sql.js / WASM)
-- Updated: 2026-07-03 (migration 004)

-- ── Users & Auth ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  display_name  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL DEFAULT (datetime('now', '+30 days'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ── Players (cross-tournament identity) ─────────────────────

CREATE TABLE IF NOT EXISTS players (
  id            TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL,
  embark_id     TEXT UNIQUE,
  discord_name  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Seasons ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS seasons (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  started_at  TEXT,
  ended_at    TEXT
);

-- ── Tournaments ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tournaments (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_id    TEXT REFERENCES seasons(id),
  name         TEXT NOT NULL,
  mode         TEXT NOT NULL DEFAULT '1x1' CHECK(mode IN ('1x1','2x2')),
  status       TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','completed')),
  total_rounds INTEGER NOT NULL DEFAULT 3,
  matchup_type TEXT CHECK(matchup_type IN ('mirrored','mixed')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  started_at   TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tournaments_user ON tournaments(user_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_season ON tournaments(season_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_completed ON tournaments(completed_at);

-- ── Participants ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tournament_participants (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id     TEXT REFERENCES players(id),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'player' CHECK(type IN ('player','team')),
  embark_id     TEXT,
  hours_played  INTEGER,
  lobby_type    TEXT CHECK(lobby_type IN ('pvp','pve','pvpve')),
  player_type   TEXT CHECK(player_type IN ('pvp','pve','pvpve')),
  amplifier     TEXT,
  shield        TEXT,
  discord_role  TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_participant_player ON tournament_participants(player_id);

-- Team members (only for 2×2 mode)
CREATE TABLE IF NOT EXISTS participant_members (
  participant_id TEXT NOT NULL REFERENCES tournament_participants(id) ON DELETE CASCADE,
  player_name    TEXT NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (participant_id, player_name)
);

-- ── Tasks ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tournament_tasks (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  points        INTEGER NOT NULL DEFAULT 1,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tasks_tournament ON tournament_tasks(tournament_id);

-- ── Contracts ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contracts (
  id            TEXT PRIMARY KEY,
  season_id     TEXT NOT NULL REFERENCES seasons(id),
  category      TEXT NOT NULL CHECK(category IN ('pve','pvp','pvpve','boosty')),
  text          TEXT NOT NULL,
  points        INTEGER NOT NULL DEFAULT 2,
  is_legendary  INTEGER NOT NULL DEFAULT 0,
  boosty_author TEXT,
  completed_by  TEXT,
  completed_at  TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contracts_season ON contracts(season_id);
CREATE INDEX IF NOT EXISTS idx_contracts_legendary ON contracts(season_id, is_legendary);

-- ── Protocols ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS protocols (
  id              TEXT PRIMARY KEY,
  season_id       TEXT NOT NULL REFERENCES seasons(id),
  text            TEXT NOT NULL,
  penalty_seconds INTEGER NOT NULL DEFAULT 60,
  boosty_author   TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_protocols_season ON protocols(season_id);

-- ── Round Results ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS round_results (
  id                      TEXT PRIMARY KEY,
  tournament_id           TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number            INTEGER NOT NULL,
  participant_id          TEXT NOT NULL REFERENCES tournament_participants(id) ON DELETE CASCADE,
  points_earned           INTEGER NOT NULL DEFAULT 0,
  tasks_completed         TEXT,
  map_name                TEXT,
  map_condition           TEXT,
  started_at              TEXT,
  ended_at                TEXT,
  deaths                  INTEGER DEFAULT 0,
  loot_allowed            INTEGER DEFAULT 1,
  crafted_keys_used       INTEGER DEFAULT 0,
  penalty_seconds_applied INTEGER DEFAULT 0,
  created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_round_results_tournament ON round_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_round_results_participant ON round_results(participant_id);
CREATE INDEX IF NOT EXISTS idx_round_map ON round_results(map_name);

-- ── Round-assigned contracts ─────────────────────────────────

CREATE TABLE IF NOT EXISTS round_contracts (
  id                      TEXT PRIMARY KEY,
  round_result_id         TEXT NOT NULL REFERENCES round_results(id) ON DELETE CASCADE,
  contract_id             TEXT NOT NULL REFERENCES contracts(id),
  participant_id          TEXT NOT NULL REFERENCES tournament_participants(id),
  completed               INTEGER NOT NULL DEFAULT 0,
  completed_by_opponent   INTEGER NOT NULL DEFAULT 0,
  points_earned           INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_round_contracts_result ON round_contracts(round_result_id);
CREATE INDEX IF NOT EXISTS idx_round_contracts_participant ON round_contracts(participant_id);

-- ── Round-assigned protocols ─────────────────────────────────

CREATE TABLE IF NOT EXISTS round_protocols (
  id              TEXT PRIMARY KEY,
  round_result_id TEXT NOT NULL REFERENCES round_results(id) ON DELETE CASCADE,
  protocol_id     TEXT NOT NULL REFERENCES protocols(id),
  participant_id  TEXT NOT NULL REFERENCES tournament_participants(id),
  violated        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_round_protocols_result ON round_protocols(round_result_id);
CREATE INDEX IF NOT EXISTS idx_round_protocols_participant ON round_protocols(participant_id);

-- ── Final Standings (computed on tournament completion) ──────

CREATE TABLE IF NOT EXISTS tournament_standings (
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES tournament_participants(id) ON DELETE CASCADE,
  total_points  INTEGER NOT NULL DEFAULT 0,
  rank          INTEGER NOT NULL,
  is_winner     INTEGER DEFAULT 0,
  mmr_before    INTEGER,
  mmr_after     INTEGER,
  streak        INTEGER DEFAULT 0,
  PRIMARY KEY (tournament_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_standings_participant ON tournament_standings(participant_id);
CREATE INDEX IF NOT EXISTS idx_standings_winner ON tournament_standings(tournament_id, is_winner);

-- ── Rewards ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tournament_rewards (
  id              TEXT PRIMARY KEY,
  tournament_id   TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  participant_id  TEXT NOT NULL REFERENCES tournament_participants(id) ON DELETE CASCADE,
  reward_type     TEXT NOT NULL CHECK(reward_type IN ('blueprint','weapon','key','discord_role','other')),
  reward_name     TEXT NOT NULL,
  giver_order     INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rewards_tournament   ON tournament_rewards(tournament_id);
CREATE INDEX IF NOT EXISTS idx_rewards_participant  ON tournament_rewards(participant_id);

-- ── Season-level player ratings (imported from Google Sheets) ─

CREATE TABLE IF NOT EXISTS season_player_ratings (
  season_id  TEXT NOT NULL REFERENCES seasons(id),
  mode       TEXT NOT NULL CHECK(mode IN ('1x1','2x2')),
  rank       INTEGER NOT NULL,
  nickname   TEXT NOT NULL,
  wins       INTEGER NOT NULL DEFAULT 0,
  losses     INTEGER NOT NULL DEFAULT 0,
  streak     INTEGER NOT NULL DEFAULT 0,
  mmr        INTEGER NOT NULL DEFAULT 1000,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (season_id, mode, nickname)
);

CREATE INDEX IF NOT EXISTS idx_spr_season_mode ON season_player_ratings(season_id, mode);
CREATE INDEX IF NOT EXISTS idx_spr_rank ON season_player_ratings(season_id, mode, rank);

-- ── Extension templates (per-tournament) ─────────────────────

CREATE TABLE IF NOT EXISTS tournament_complications (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tournament_bonus_tasks (
  id            TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  points        INTEGER NOT NULL DEFAULT 2,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- ── Schema version tracking ──────────────────────────────────

CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
