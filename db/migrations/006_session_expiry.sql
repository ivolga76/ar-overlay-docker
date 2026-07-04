-- Migration 006: add session expiry (30-day TTL)
-- Existing sessions get expires_at = created_at + 30 days

ALTER TABLE sessions ADD COLUMN expires_at TEXT;

UPDATE sessions SET expires_at = datetime(created_at, '+30 days') WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
