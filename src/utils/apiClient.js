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

// ── Seasons ──────────────────────────────────────────────────

export async function getSeasons(token) {
  const data = await apiCall('/api/seasons', { token });
  return data.seasons;
}

// ── Tournaments ──────────────────────────────────────────────

export async function getTournaments(token, seasonId, type) {
  const params = new URLSearchParams();
  if (seasonId) params.set('season_id', seasonId);
  if (type) params.set('type', type);
  const qs = params.toString();
  const data = await apiCall(`/api/tournaments${qs ? `?${qs}` : ''}`, { token });
  return data.tournaments;
}

export async function searchPlayers(query, token) {
  const data = await apiCall(`/api/players?search=${encodeURIComponent(query)}&limit=8`, { token });
  return data.players || [];
}

export async function searchTeams(query, token) {
  const data = await apiCall(`/api/teams?search=${encodeURIComponent(query)}`, { token });
  return data.teams || [];
}

export async function getTournament(id, token) {
  return await apiCall(`/api/tournaments/${id}`, { token });
}

export async function createTournament({ name, mode, totalRounds, season_id, type, participants }, token) {
  const data = await apiCall('/api/tournaments', {
    method: 'POST',
    body: { name, mode, totalRounds, season_id, type, participants },
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

export async function addParticipant(tournamentId, { name, type, players, embark_id, hours_played, lobby_type, player_type }, token) {
  const data = await apiCall(`/api/tournaments/${tournamentId}/participants`, {
    method: 'POST',
    body: { name, type, players, embark_id, hours_played, lobby_type, player_type },
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

// ── Season 2: Contracts ──────────────────────────────────────

export async function getContracts(seasonId, token, category, legendary) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (legendary !== undefined) params.set('legendary', legendary ? '1' : '0');
  const qs = params.toString();
  const data = await apiCall(`/api/seasons/${seasonId}/contracts${qs ? `?${qs}` : ''}`, { token });
  return data.contracts;
}

export async function addContract(seasonId, { category, text, points, is_legendary, boosty_author }, token) {
  const data = await apiCall(`/api/seasons/${seasonId}/contracts`, {
    method: 'POST',
    body: { category, text, points, is_legendary, boosty_author },
    token,
  });
  return data.contract;
}

export async function updateContract(seasonId, contractId, fields, token) {
  const data = await apiCall(`/api/seasons/${seasonId}/contracts/${contractId}`, {
    method: 'PUT',
    body: fields,
    token,
  });
  return data.contract;
}

export async function deleteContract(seasonId, contractId, token) {
  return await apiCall(`/api/seasons/${seasonId}/contracts/${contractId}`, {
    method: 'DELETE',
    token,
  });
}

export async function getLegendaryContracts(seasonId, token) {
  const data = await apiCall(`/api/seasons/${seasonId}/legendary`, { token });
  return data.legendary;
}

export async function completeLegendaryContract(roundId, contractId, playerName, token) {
  return await apiCall(`/api/rounds/${roundId}/legendary/${contractId}`, {
    method: 'POST',
    body: { player_name: playerName },
    token,
  });
}

// ── Season 2: Protocols ──────────────────────────────────────

export async function getProtocols(seasonId, token) {
  const data = await apiCall(`/api/seasons/${seasonId}/protocols`, { token });
  return data.protocols;
}

export async function addProtocol(seasonId, { text, penalty_seconds, boosty_author }, token) {
  const data = await apiCall(`/api/seasons/${seasonId}/protocols`, {
    method: 'POST',
    body: { text, penalty_seconds, boosty_author },
    token,
  });
  return data.protocol;
}

export async function updateProtocol(seasonId, protocolId, fields, token) {
  const data = await apiCall(`/api/seasons/${seasonId}/protocols/${protocolId}`, {
    method: 'PUT',
    body: fields,
    token,
  });
  return data.protocol;
}

export async function deleteProtocol(seasonId, protocolId, token) {
  return await apiCall(`/api/seasons/${seasonId}/protocols/${protocolId}`, {
    method: 'DELETE',
    token,
  });
}

// ── Season 2: Round assignments ──────────────────────────────

export async function assignRoundContracts(tournamentId, roundId, token) {
  const data = await apiCall(`/api/tournaments/${tournamentId}/rounds/${roundId}/contracts`, {
    method: 'POST',
    token,
  });
  return data;
}

export async function assignRoundProtocols(tournamentId, roundId, token) {
  const data = await apiCall(`/api/tournaments/${tournamentId}/rounds/${roundId}/protocols`, {
    method: 'POST',
    token,
  });
  return data;
}

export async function getRoundAssignments(tournamentId, roundId, token) {
  const data = await apiCall(`/api/tournaments/${tournamentId}/rounds/${roundId}/assignments`, { token });
  return data;
}

export async function updateRoundContract(assignmentId, fields, token) {
  const data = await apiCall(`/api/round-contracts/${assignmentId}`, {
    method: 'PUT',
    body: fields,
    token,
  });
  return data.assignment;
}

export async function updateRoundProtocol(assignmentId, fields, token) {
  const data = await apiCall(`/api/round-protocols/${assignmentId}`, {
    method: 'PUT',
    body: fields,
    token,
  });
  return data.assignment;
}
