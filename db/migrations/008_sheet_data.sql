-- Migration 008: Sheet-imported match history and team rosters
-- ============================================================

-- Match history imported from Google Sheets (1x1 and 2x2)
CREATE TABLE IF NOT EXISTS sheet_matches (
  id            TEXT PRIMARY KEY,
  season_id     TEXT NOT NULL REFERENCES seasons(id),
  mode          TEXT NOT NULL CHECK(mode IN ('1x1','2x2')),
  match_number  INTEGER NOT NULL,
  match_date    TEXT,           -- e.g. "22.06"
  format        TEXT NOT NULL CHECK(format IN ('pve','pvp')),
  player_a      TEXT NOT NULL,  -- player or team name
  player_b      TEXT NOT NULL,
  winner        TEXT,           -- winner name
  map_name      TEXT,           -- map name
  vod_url       TEXT,           -- link to VOD
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sheet_matches_season_mode ON sheet_matches(season_id, mode);
CREATE INDEX IF NOT EXISTS idx_sheet_matches_player_a ON sheet_matches(player_a);
CREATE INDEX IF NOT EXISTS idx_sheet_matches_player_b ON sheet_matches(player_b);

-- Team rosters (2x2) imported from Google Sheets
CREATE TABLE IF NOT EXISTS sheet_teams (
  id            TEXT PRIMARY KEY,
  season_id     TEXT NOT NULL REFERENCES seasons(id),
  team_number   INTEGER NOT NULL,
  team_name     TEXT NOT NULL,
  player_a      TEXT,           -- player name
  player_b      TEXT,           -- player name
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sheet_teams_season ON sheet_teams(season_id);
CREATE INDEX IF NOT EXISTS idx_sheet_teams_name ON sheet_teams(team_name);
