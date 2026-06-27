-- Migration 003: Season 2 support
-- Adds seasons, contracts, protocols, and player profile fields.

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

-- ── Add season_id to tournaments ─────────────────────────────

-- SQLite doesn't support ADD COLUMN IF NOT EXISTS, but we
-- only run this migration once, so it's safe.
ALTER TABLE tournaments ADD COLUMN season_id TEXT REFERENCES seasons(id);

-- ── New participant fields ───────────────────────────────────

ALTER TABLE tournament_participants ADD COLUMN embark_id TEXT;
ALTER TABLE tournament_participants ADD COLUMN hours_played INTEGER;
ALTER TABLE tournament_participants ADD COLUMN lobby_type TEXT CHECK(lobby_type IN ('pvp','pve','pvpve'));
ALTER TABLE tournament_participants ADD COLUMN player_type TEXT CHECK(player_type IN ('pvp','pve','pvpve'));

-- ── Contracts pool ───────────────────────────────────────────

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

-- ── Protocols pool ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS protocols (
  id              TEXT PRIMARY KEY,
  season_id       TEXT NOT NULL REFERENCES seasons(id),
  text            TEXT NOT NULL,
  penalty_seconds INTEGER NOT NULL DEFAULT 60,
  boosty_author   TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_protocols_season ON protocols(season_id);

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

-- ── Backfill: create Season 1 and assign existing tournaments ─

INSERT OR IGNORE INTO seasons (id, name, description, status, started_at)
VALUES ('season-1', 'Сезон 1: Битва за Респект', 'Первый сезон турниров Битва за Респект. Турниры 1×1 и 2×2.', 'active', '2025-01-01');

UPDATE tournaments SET season_id = 'season-1' WHERE season_id IS NULL;

-- ── Create Season 2 ──────────────────────────────────────────

INSERT OR IGNORE INTO seasons (id, name, description, status, started_at)
VALUES ('season-2', 'Сезон 2: Битва за Респект', 'Второй сезон турниров Битва за Респект. Контракты, легендарные контракты, активные протоколы, Boosty-интеграция.', 'active', '2026-06-22');
