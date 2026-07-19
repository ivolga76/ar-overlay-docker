-- Migration 010: Add type column to tournaments (pve/pvp/pvpve)
-- Supports filtering contracts by tournament type in the overlay roulette.

ALTER TABLE tournaments ADD COLUMN type TEXT CHECK(type IN ('pve','pvp','pvpve'));
