// Admin helpers — shared across admin pages

/** Get the API base URL — same host as leaderboard, port 3001 */
export function getApiBase(): string {
  if (typeof window === 'undefined') return process.env.API_URL ?? 'http://localhost:3001';
  const host = window.location.hostname;
  // In production (VPS), API is on the same host, port 3001
  return `http://${host}:3001`;
}

/** Read admin_token from cookie */
export function getAdminToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  return match ? match[1] : '';
}
