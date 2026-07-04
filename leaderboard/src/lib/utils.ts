// ARC Raiders Tournament — Utility helpers

/**
 * Compute MMR from total points, wins, and losses.
 * Base MMR = 1000 (matches the Google Sheets convention).
 * Formula: base + points × 3 + wins × 15 − losses × 5
 *
 * Kept in sync with production-server.js computeSeasonRatings().
 */
export function computeMmr(
  totalPoints: number,
  wins: number,
  losses: number
): number {
  const BASE_MMR = 1000;
  const POINTS_WEIGHT = 3;
  const WIN_BONUS = 15;
  const LOSS_PENALTY = 5;

  return BASE_MMR + totalPoints * POINTS_WEIGHT + wins * WIN_BONUS - losses * LOSS_PENALTY;
}

/**
 * Format MMR for display:
 * - Positive delta from 1000 shown in cyan
 * - Negative in red
 * - Exactly 1000 in muted
 */
export function formatMmr(mmr: number): { value: string; colorClass: string } {
  const delta = mmr - 1000;
  if (delta > 0) {
    return { value: mmr.toString(), colorClass: 'text-accent-cyan' };
  }
  if (delta < 0) {
    return { value: mmr.toString(), colorClass: 'text-danger' };
  }
  return { value: mmr.toString(), colorClass: 'text-text-muted' };
}

/**
 * Format a date string to Russian locale.
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generate an ARC Raiders-styled placeholder avatar SVG data URI.
 */
export function avatarPlaceholder(name: string): string {
  const colors = ['#ff00ff', '#00ffff', '#ffb800', '#0066ff', '#e83030', '#00cc44'];
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const color = colors[hash % colors.length];
  const initial = name.charAt(0).toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="8" fill="#14141a" stroke="${color}" stroke-width="1.5"/>
    <text x="32" y="42" text-anchor="middle" fill="${color}" font-family="Urbanist, sans-serif" font-weight="800" font-size="28">${initial}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
