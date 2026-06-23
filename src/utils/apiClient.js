// src/utils/apiClient.js — Tournament API client
// Works with the auth token from AuthContext.

const API_BASE = import.meta.env.DEV
  ? 'http://localhost:3001'
  : window.location.origin;

async function apiCall(path, { method = 'GET', body = null, token = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Ошибка ${res.status}`);
  return data;
}

// ── Tournaments ──────────────────────────────────────────────

export async function getTournaments(token) {
  const data = await apiCall('/api/tournaments', { token });
  return data.tournaments;
}

export async function getTournament(id, token) {
  return await apiCall(`/api/tournaments/${id}`, { token });
}

export async function createTournament({ name, mode, totalRounds }, token) {
  const data = await apiCall('/api/tournaments', {
    method: 'POST',
    body: { name, mode, totalRounds },
    token,
  });
  return data.tournament;
}

export async function updateTournament(id, fields, token) {
  const data = await apiCall(`/api/tournaments/${id}`, {
    method: 'PUT',
    body: fields,
    token,
  });
  return data.tournament;
}

export async function deleteTournament(id, token) {
  return await apiCall(`/api/tournaments/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function startTournament(id, token) {
  const data = await apiCall(`/api/tournaments/${id}/start`, {
    method: 'POST',
    token,
  });
  return data.tournament;
}

export async function completeTournament(id, token) {
  return await apiCall(`/api/tournaments/${id}/complete`, {
    method: 'POST',
    token,
  });
}

// ── Leaderboard ──────────────────────────────────────────────

export async function getGlobalLeaderboard(limit = 50) {
  const data = await apiCall(`/api/leaderboard?limit=${limit}`);
  return data.leaderboard;
}

export async function getTournamentLeaderboard(tournamentId) {
  return await apiCall(`/api/leaderboard/${tournamentId}`);
}

// ── Profile ──────────────────────────────────────────────────

export async function getProfile(token) {
  return await apiCall('/api/profile', { token });
}

// ── Participants ──────────────────────────────────────────────

export async function getParticipants(tournamentId, token) {
  const data = await apiCall(`/api/tournaments/${tournamentId}/participants`, { token });
  return data.participants;
}

export async function addParticipant(tournamentId, { name, type, players }, token) {
  const data = await apiCall(`/api/tournaments/${tournamentId}/participants`, {
    method: 'POST',
    body: { name, type, players },
    token,
  });
  return data.participant;
}

export async function removeParticipant(tournamentId, participantId, token) {
  return await apiCall(`/api/tournaments/${tournamentId}/participants/${participantId}`, {
    method: 'DELETE',
    token,
  });
}

// ── Tasks ─────────────────────────────────────────────────────

export async function getTasks(tournamentId, token) {
  const data = await apiCall(`/api/tournaments/${tournamentId}/tasks`, { token });
  return data.tasks;
}

export async function addTask(tournamentId, { text, points }, token) {
  const data = await apiCall(`/api/tournaments/${tournamentId}/tasks`, {
    method: 'POST',
    body: { text, points },
    token,
  });
  return data.task;
}

export async function updateTask(tournamentId, taskId, fields, token) {
  const data = await apiCall(`/api/tournaments/${tournamentId}/tasks/${taskId}`, {
    method: 'PUT',
    body: fields,
    token,
  });
  return data.task;
}

export async function removeTask(tournamentId, taskId, token) {
  return await apiCall(`/api/tournaments/${tournamentId}/tasks/${taskId}`, {
    method: 'DELETE',
    token,
  });
}

// ── Round Results ─────────────────────────────────────────────

export async function recordRoundResult(tournamentId, { round_number, participant_id, points_earned, tasks_completed }, token) {
  return await apiCall(`/api/tournaments/${tournamentId}/rounds`, {
    method: 'POST',
    body: { round_number, participant_id, points_earned, tasks_completed },
    token,
  });
}
