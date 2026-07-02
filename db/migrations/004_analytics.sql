-- ============================================================
-- Migration 004: Tournament analytics & match detail
-- Date: 2026-07-03
-- Adds: player identity, builds, maps, timing, MMR, rewards,
--       matchup metadata, and round-level combat stats.
-- ============================================================

-- ── A. Player identity (cross-tournament tracking) ──────────

CREATE TABLE IF NOT EXISTS players (
  id            TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL,
  embark_id     TEXT UNIQUE,
  discord_name  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Link participants to persistent player records (nullable —
-- existing rows stay NULL; new tournaments may link)
ALTER TABLE tournament_participants ADD COLUMN player_id TEXT REFERENCES players(id);

-- ── B. Participant build (amplifier + shield) ──────────────

ALTER TABLE tournament_participants ADD COLUMN amplifier TEXT;
ALTER TABLE tournament_participants ADD COLUMN shield    TEXT;
ALTER TABLE tournament_participants ADD COLUMN discord_role TEXT;

-- ── C. Tournament metadata ─────────────────────────────────

ALTER TABLE tournaments ADD COLUMN started_at   TEXT;
ALTER TABLE tournaments ADD COLUMN matchup_type TEXT CHECK(matchup_type IN ('mirrored','mixed'));

-- ── D. Round detail (map, timing, combat stats) ────────────

ALTER TABLE round_results ADD COLUMN map_name               TEXT;
ALTER TABLE round_results ADD COLUMN map_condition          TEXT;
ALTER TABLE round_results ADD COLUMN started_at             TEXT;
ALTER TABLE round_results ADD COLUMN ended_at               TEXT;
ALTER TABLE round_results ADD COLUMN deaths                 INTEGER DEFAULT 0;
ALTER TABLE round_results ADD COLUMN loot_allowed           INTEGER DEFAULT 1;
ALTER TABLE round_results ADD COLUMN crafted_keys_used      INTEGER DEFAULT 0;
ALTER TABLE round_results ADD COLUMN penalty_seconds_applied INTEGER DEFAULT 0;

-- ── E. Standings enrichment (MMR history, winner flag) ─────

ALTER TABLE tournament_standings ADD COLUMN is_winner   INTEGER DEFAULT 0;
ALTER TABLE tournament_standings ADD COLUMN mmr_before  INTEGER;
ALTER TABLE tournament_standings ADD COLUMN mmr_after   INTEGER;
ALTER TABLE tournament_standings ADD COLUMN streak      INTEGER DEFAULT 0;

-- ── F. Rewards ─────────────────────────────────────────────

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

-- ── G. Convenience indexes for new query patterns ──────────

CREATE INDEX IF NOT EXISTS idx_round_map         ON round_results(map_name);
CREATE INDEX IF NOT EXISTS idx_standings_winner  ON tournament_standings(tournament_id, is_winner);
CREATE INDEX IF NOT EXISTS idx_participant_player ON tournament_participants(player_id);
