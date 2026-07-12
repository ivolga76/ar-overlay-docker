// import-sheets.js — импорт данных из Google Sheets в БД
// Вызывается по POST /api/import-sheets (админский эндпоинт)
// или напрямую: node import-sheets.js

import https from 'node:https';
import { randomUUID } from 'node:crypto';
import { getDb, query, queryOne, run, execScript, saveToDisk } from './db/connection.js';

const SHEET_ID = '1xbsVk-O1EbyaPWoh8lNynZSrH-Y5G3ft7P4GOGW7RB8';
const SEASON_2_ID = 'season-2';
const SEASON_1_ID = 'season-1';

// ── Конфигурация вкладок ────────────────────────────────────────

const SHEETS = {
  ratings1x1:  { gid: '0',           type: 'ratings', mode: '1x1', season: SEASON_2_ID, name: 'Рейтинг 1×1' },
  ratings2x2:  { gid: '1621578203',  type: 'ratings', mode: '2x2', season: SEASON_2_ID, name: 'Рейтинг 2×2' },
  matches1x1:  { gid: '1628464435',  type: 'matches', mode: '1x1', season: SEASON_2_ID, name: 'Матчи 1×1' },
  matches2x2:  { gid: '73362569',    type: 'matches', mode: '2x2', season: SEASON_2_ID, name: 'Матчи 2×2' },
  teams2x2:    { gid: '986291277',   type: 'teams',   mode: '2x2', season: SEASON_2_ID, name: 'Команды 2×2' },
  hunters:     { gid: '548883307',   type: 'hunters',            season: SEASON_2_ID, name: 'Охотники' },
  contractsPvP:{ gid: '301087892',   type: 'contracts', category: 'pvp', season: SEASON_2_ID, name: 'Контракты PvP' },
  contractsPvE:{ gid: '1276977015',  type: 'contracts', category: 'pve', season: SEASON_2_ID, name: 'Контракты PvE' },
  protocols:   { gid: '1242362499',  type: 'protocols',           season: SEASON_2_ID, name: 'Протоколы PvE' },
  archive1x1:  { gid: '1254248180',  type: 'ratings', mode: '1x1', season: SEASON_1_ID, name: 'Архив 1×1' },
  archive2x2:  { gid: '2104659808',  type: 'ratings', mode: '2x2', season: SEASON_1_ID, name: 'Архив 2×2' },
};

// ── HTTP Helpers ─────────────────────────────────────────────────

function fetchCSV(gid) {
  return new Promise((resolve, reject) => {
    const url = `/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
    https.get({ hostname: 'docs.google.com', path: url, headers: { 'Accept': 'text/csv' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        https.get(res.headers.location, (r2) => {
          let data = '';
          r2.on('data', c => data += c);
          r2.on('end', () => resolve(data));
        }).on('error', reject);
        return;
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ── CSV Parser ───────────────────────────────────────────────────

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else { cell += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
        row.push(cell);
        if (row.some(c => c.trim())) rows.push([...row]);
        row = []; cell = '';
      } else { cell += ch; }
    }
  }
  if (cell || row.length) { row.push(cell); if (row.some(c => c.trim())) rows.push([...row]); }
  return rows;
}

function rowToObj(row, cols) {
  const obj = {};
  for (let i = 0; i < cols.length; i++) {
    obj[cols[i]] = (row[i] || '').trim();
  }
  return obj;
}

// ── Парсеры для разных типов вкладок ─────────────────────────────

function parseIntSafe(v) { const n = parseInt(v); return isNaN(n) ? 0 : n; }

/** Парсит рейтинг (1х1 или 2х2). Возвращает массив { rank, nickname, wins, losses, mmr }. */
function parseRatings(rows) {
  // Первая строка — заголовок
  const players = [];
  let rank = 1;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const place = r[0]?.trim() || '';
    const nameIdx = r[1] === 'Команда' ? 2 : 2;  // колонка с ником/командой всегда [2]
    const nick = r[nameIdx]?.trim();
    const mmrRaw = r[3]?.trim();
    const winsRaw = r[4]?.trim();
    const lossesRaw = r[5]?.trim();

    if (!nick || nick === 'Ник' || nick === 'Команда') continue;
    // #REF! in rank column — player still valid, just skip the broken rank value
    if (place === 'Telegram:' || place === 'Twitch:' || place === 'YouTube:' || place === 'Discord:' || place === 'Boosty:') continue;

    players.push({
      rank,
      nickname: nick,
      wins: parseIntSafe(winsRaw),
      losses: parseIntSafe(lossesRaw),
      mmr: parseIntSafe(mmrRaw),
    });
    rank++;
  }
  return players;
}

/** Парсит архивный рейтинг (1х1 или 2х2).
 *  archive1x1: Место, Ник, Победы, Поражения, Побед подряд
 *  archive2x2: Место, Ник, Победа, Побед подряд, Поражение (другой порядок!)
 */
function parseArchiveRatings(rows, mode = '1x1') {
  // Определяем формат по заголовку (строка 0)
  const header = rows[0] || [];
  const is2x2 = mode === '2x2' || header.some(h => h && h.includes('Побед подряд') && !h.includes('Поражения'));

  const players = [];
  let rank = 1;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const place = (r[0] || r[1] || '').trim();
    const nickIdx = r[1] === 'Ник' ? 2 : (r[1] && !isNaN(parseInt(r[1])) ? 2 : 1);
    const nick = r[nickIdx]?.trim();

    let winsRaw, lossesRaw, streakRaw;
    if (is2x2) {
      // archive2x2: Ник, Победа, Побед подряд, Поражение
      winsRaw = r[nickIdx + 1]?.trim();
      streakRaw = r[nickIdx + 2]?.trim();
      lossesRaw = r[nickIdx + 3]?.trim();
    } else {
      // archive1x1: Ник, Победы, Поражения, Побед подряд
      winsRaw = r[nickIdx + 1]?.trim();
      lossesRaw = r[nickIdx + 2]?.trim();
      streakRaw = r[nickIdx + 3]?.trim();
    }

    if (!nick || nick === 'Ник' || nick === 'Команда') continue;
    if (place.startsWith('#')) continue;
    if (nick.startsWith('https://') || nick.startsWith('t.me/')) continue;
    if (nick.includes('Дата последнего обновления')) continue;

    const wins = parseIntSafe(winsRaw);
    const losses = parseIntSafe(lossesRaw);
    const streak = parseIntSafe(streakRaw);
    const mmr = 1000 + wins * 25 - losses * 15 + streak * 5;

    players.push({ rank, nickname: nick, wins, losses, streak, mmr });
    rank++;
  }
  return players;
}

/** Парсит охотников. Возвращает массив { nickname, embark_id, discord_name, hours_played }. */
function parseHunters(rows) {
  const hunters = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const nick = r[2]?.trim();
    const embarkId = r[3]?.trim();
    const discord = r[4]?.trim();
    const hours = r[5]?.trim();

    if (!nick) continue;
    hunters.push({
      nickname: nick,
      embark_id: embarkId || null,
      discord_name: discord || null,
      hours_played: parseIntSafe(hours) || null,
    });
  }
  return hunters;
}

/** Парсит контракты (PvP/PvE) из сложной структуры с картами. */
function parseContracts(rows, category) {
  const contracts = [];
  let currentMap = null;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const col0 = r[0]?.trim();
    const col1 = r[1]?.trim();
    const col2 = r[2]?.trim();
    const col3 = r[3]?.trim();

    // Определяем карту: если col0 не пустой — это название карты
    if (col0 && !col0.startsWith('«') && !col0.startsWith(',')) {
      currentMap = col0;
      continue;
    }

    // Пропускаем строки-разделители (пустые или с картой)
    if (!col1 && !col2) continue;

    // Ищем контракт: col1 — название, col2 — описание, col3 — очки
    const name = col1 || col2; // в разных форматах
    const desc = col2 || '';
    const points = parseIntSafe(col3) || 1;

    if (name && name.startsWith('«') && name.length > 3) {
      contracts.push({
        map: currentMap,
        name: name.replace(/^«|»$/g, '').trim(),
        description: desc.replace(/^«|»$/g, '').trim(),
        points,
        category,
      });
    }
  }
  return contracts;
}

/** Парсит матчи (1×1 или 2×2). Колонки: Номер матча, Дата, Формат, Игрок/Команда A, Игрок/Команда B, Победитель, Карта, Запись */
function parseMatches(rows) {
  const matches = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const num = r[1]?.trim();
    const date = r[2]?.trim();
    const format = (r[3]?.trim() || '').toUpperCase();
    const playerA = r[4]?.trim();
    const playerB = r[5]?.trim();
    const winner = r[6]?.trim();
    const map = r[7]?.trim();
    const vod = r[8]?.trim();

    if (!playerA || !playerB) continue;
    // Skip header-like rows
    if (playerA === 'Игрок A' || playerA === 'Команда A') continue;

    matches.push({
      match_number: parseIntSafe(num),
      date: date || null,
      format: format === 'PVE' ? 'pve' : format === 'PVP' ? 'pvp' : 'pve',
      player_a: playerA,
      player_b: playerB,
      winner: winner || null,
      map: map || null,
      vod_url: vod === 'Смотреть матч' ? null : (vod || null),
    });
  }
  return matches;
}

/** Парсит составы команд 2×2. Колонки: Номер, Команда, Игрок A, Игрок B */
function parseTeams(rows) {
  const teams = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const num = r[1]?.trim();
    const teamName = r[2]?.trim();
    const playerA = r[3]?.trim();
    const playerB = r[4]?.trim();

    if (!teamName || teamName === 'Команда') continue;
    if (!playerA && !playerB) continue;

    teams.push({
      team_number: parseIntSafe(num),
      team_name: teamName,
      player_a: playerA || null,
      player_b: playerB || null,
    });
  }
  return teams;
}

/** Парсит протоколы. */
function parseProtocols(rows) {
  const protocols = [];
  let currentMap = null;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const col0 = r[0]?.trim();
    const col1 = r[1]?.trim();
    const col2 = r[2]?.trim();
    const col3 = r[3]?.trim();

    // Универсальные — специальный случай
    if (col0 === 'Универсальные') { currentMap = 'Универсальные'; continue; }

    // Название карты: непустое, не начинается с «, не универсальные
    if (col0 && !col0.startsWith('«') && col0.length < 30) {
      currentMap = col0;
      continue;
    }

    // Протокол: col1 содержит название (может быть с автором)
    // или col1 пустое, а col2 содержит название
    const name = col1 || col2 || '';
    const desc = col1 ? col2 : '';  // если col1 занят названием, описание в col2

    if (name && name.length > 2) {
      protocols.push({
        map: currentMap,
        name: name.replace(/^«|»$/g, '').trim(),
        description: (desc || '').replace(/^«|»$/g, '').trim(),
        penalty_minutes: parseIntSafe(col3) || 1,
      });
    }
  }
  return protocols;
}

// ── Импорт в БД ──────────────────────────────────────────────────

function ensureSeason(seasonId, name) {
  const existing = queryOne('SELECT id FROM seasons WHERE id = ?', [seasonId]);
  if (existing) return;
  run(
    "INSERT INTO seasons (id, name, status) VALUES (?, ?, 'active')",
    [seasonId, name]
  );
  saveToDisk();
}

/** Импорт рейтингов (season_player_ratings). */
function importRatings(players, seasonId, mode) {
  if (players.length === 0) return { upserted: 0 };

  // Проверяем, есть ли уже данные
  const existing = query(
    'SELECT COUNT(*) as cnt FROM season_player_ratings WHERE season_id = ? AND mode = ?',
    [seasonId, mode]
  );

  if (existing[0]?.cnt > 0) {
    run('DELETE FROM season_player_ratings WHERE season_id = ? AND mode = ?', [seasonId, mode]);
  }

  let playersUpdated = 0;
  const now = new Date().toISOString();
  for (const p of players) {
    run(
      `INSERT OR REPLACE INTO season_player_ratings (season_id, mode, rank, nickname, wins, losses, streak, mmr, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [seasonId, mode, p.rank, p.nickname, p.wins, p.losses, p.streak || 0, p.mmr, now]
    );

    // Для 1x1 — обновляем players.current_mmr (синхронизация с импортированным рейтингом)
    if (mode === '1x1') {
      const player = queryOne('SELECT id, current_mmr FROM players WHERE display_name = ?', [p.nickname]);
      if (player) {
        run('UPDATE players SET current_mmr = ? WHERE id = ?', [p.mmr, player.id]);
        playersUpdated++;
      } else {
        const id = randomUUID();
        run('INSERT INTO players (id, display_name, current_mmr) VALUES (?, ?, ?)', [id, p.nickname, p.mmr]);
        playersUpdated++;
      }
    }
  }
  saveToDisk();
  return { upserted: players.length, playersUpdated };
}

/** Импорт охотников (players). Обновляет embark_id, discord_name, часы. */
function importHunters(hunters) {
  let upserted = 0;
  for (const h of hunters) {
    const existing = queryOne(
      'SELECT id, embark_id, discord_name FROM players WHERE display_name = ?',
      [h.nickname]
    );
    if (existing) {
      // Обновляем, если есть новые данные
      const updates = [];
      const params = [];
      if (h.embark_id && h.embark_id !== existing.embark_id) {
        updates.push('embark_id = ?'); params.push(h.embark_id);
      }
      if (h.discord_name && h.discord_name !== existing.discord_name) {
        updates.push('discord_name = ?'); params.push(h.discord_name);
      }
      if (updates.length > 0) {
        params.push(existing.id);
        run(`UPDATE players SET ${updates.join(', ')} WHERE id = ?`, params);
        upserted++;
      }
    } else {
      // Создаём нового игрока
      const id = randomUUID();
      run(
        'INSERT INTO players (id, display_name, embark_id, discord_name) VALUES (?, ?, ?, ?)',
        [id, h.nickname, h.embark_id, h.discord_name]
      );
      upserted++;
    }
  }
  saveToDisk();
  return { upserted };
}

/** Импорт контрактов. Удаляет старые для (season_id, category), вставляет из sheets. */
function importContracts(contracts, seasonId, category) {
  if (contracts.length === 0) return { inserted: 0 };

  // Удаляем старые контракты для этого сезона и категории
  run('DELETE FROM contracts WHERE season_id = ? AND category = ?', [seasonId, category]);

  let sortOrder = 0;
  for (const c of contracts) {
    const text = c.description || c.name;
    if (!text) continue;

    const id = randomUUID();
    run(
      `INSERT INTO contracts (id, season_id, category, text, points, is_legendary, sort_order)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [id, seasonId, category, text, c.points || 1, sortOrder++]
    );
  }
  saveToDisk();
  return { inserted: contracts.length };
}

/** Импорт матчей. */
function importMatches(matches, seasonId, mode) {
  if (matches.length === 0) return { inserted: 0 };

  // Удаляем старые матчи для этого сезона и режима
  run('DELETE FROM sheet_matches WHERE season_id = ? AND mode = ?', [seasonId, mode]);

  let inserted = 0;
  for (const m of matches) {
    const id = randomUUID();
    run(
      `INSERT INTO sheet_matches (id, season_id, mode, match_number, match_date, format,
         player_a, player_b, winner, map_name, vod_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, seasonId, mode, m.match_number, m.date, m.format,
       m.player_a, m.player_b, m.winner, m.map, m.vod_url]
    );
    inserted++;
  }
  saveToDisk();
  return { inserted };
}

/** Импорт составов команд. */
function importTeams(teams, seasonId) {
  if (teams.length === 0) return { inserted: 0 };

  run('DELETE FROM sheet_teams WHERE season_id = ?', [seasonId]);

  let inserted = 0;
  for (const t of teams) {
    const id = randomUUID();
    run(
      `INSERT INTO sheet_teams (id, season_id, team_number, team_name, player_a, player_b)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, seasonId, t.team_number, t.team_name, t.player_a, t.player_b]
    );
    inserted++;
  }
  saveToDisk();
  return { inserted };
}

/** Импорт протоколов. Удаляет старые для season_id, вставляет из sheets. */
function importProtocols(protocols, seasonId) {
  if (protocols.length === 0) return { inserted: 0 };

  // Удаляем старые протоколы для этого сезона
  run('DELETE FROM protocols WHERE season_id = ?', [seasonId]);

  let sortOrder = 0;
  for (const p of protocols) {
    const text = p.description || p.name;
    if (!text) continue;

    const id = randomUUID();
    run(
      `INSERT INTO protocols (id, season_id, text, penalty_seconds, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [id, seasonId, text, (p.penalty_minutes || 1) * 60, sortOrder++]
    );
  }
  saveToDisk();
  return { inserted: protocols.length };
}

// ── Главная функция экспорта ─────────────────────────────────────

/**
 * Импортирует данные из Google Sheets в БД.
 * @param {Object} [options]
 * @param {string[]} [options.sheets] — какие вкладки импортировать (ключи из SHEETS). По умолчанию все.
 * @param {boolean} [options.dryRun] — только скачать и распарсить, без записи в БД
 * @returns {Object} результат импорта
 */
export async function importFromSheets(options = {}) {
  const { sheets: filterSheets, dryRun } = options;
  const sheetsToImport = filterSheets
    ? Object.fromEntries(Object.entries(SHEETS).filter(([k]) => filterSheets.includes(k)))
    : SHEETS;

  // Убеждаемся, что сезоны существуют
  if (!dryRun) {
    ensureSeason(SEASON_2_ID, 'Сезон 2: Битва за Респект');
    ensureSeason(SEASON_1_ID, 'Сезон 1: Битва за Респект');
  }

  const summary = {};

  for (const [key, sheet] of Object.entries(sheetsToImport)) {
    console.log(`[import] загрузка: ${sheet.name} (gid=${sheet.gid})...`);
    let csv;
    try {
      csv = await fetchCSV(sheet.gid);
    } catch (err) {
      console.error(`[import] ошибка загрузки ${sheet.name}: ${err.message}`);
      summary[key] = { error: err.message };
      continue;
    }

    const rows = parseCSV(csv);
    console.log(`[import]   получено ${rows.length} строк`);

    let result = {};

    switch (sheet.type) {
      case 'ratings': {
        let players;
        if (sheet.season === SEASON_1_ID) {
          players = parseArchiveRatings(rows, sheet.mode);
        } else {
          players = parseRatings(rows);
        }
        console.log(`[import]   распознано ${players.length} игроков/команд`);
        if (!dryRun) {
          result = importRatings(players, sheet.season, sheet.mode);
        } else {
          result = { parsed: players.length, sample: players.slice(0, 3) };
        }
        break;
      }
      case 'hunters': {
        const hunters = parseHunters(rows);
        console.log(`[import]   распознано ${hunters.length} охотников`);
        if (!dryRun) {
          result = importHunters(hunters);
        } else {
          result = { parsed: hunters.length, sample: hunters.slice(0, 3) };
        }
        break;
      }
      case 'contracts': {
        const contracts = parseContracts(rows, sheet.category);
        console.log(`[import]   распознано ${contracts.length} контрактов`);
        if (!dryRun) {
          result = importContracts(contracts, sheet.season, sheet.category);
        } else {
          result = { parsed: contracts.length, sample: contracts.slice(0, 3) };
        }
        break;
      }
      case 'protocols': {
        const protocols = parseProtocols(rows);
        console.log(`[import]   распознано ${protocols.length} протоколов`);
        if (!dryRun) {
          result = importProtocols(protocols, sheet.season);
        } else {
          result = { parsed: protocols.length, sample: protocols.slice(0, 3) };
        }
        break;
      }
      case 'matches': {
        const matches = parseMatches(rows);
        console.log(`[import]   распознано ${matches.length} матчей`);
        if (!dryRun) {
          result = importMatches(matches, sheet.season, sheet.mode);
        } else {
          result = { parsed: matches.length, sample: matches.slice(0, 3) };
        }
        break;
      }
      case 'teams': {
        const teams = parseTeams(rows);
        console.log(`[import]   распознано ${teams.length} команд`);
        if (!dryRun) {
          result = importTeams(teams, sheet.season);
        } else {
          result = { parsed: teams.length, sample: teams.slice(0, 3) };
        }
        break;
      }
    }

    summary[key] = result;
  }

  return summary;
}

// ── CLI-запуск ───────────────────────────────────────────────────

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  // Инициализируем БД перед импортом
  const { initDatabase } = await import('./db/connection.js');
  const { migrate } = await import('./db/migrate.js');
  await initDatabase();
  await migrate();

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const sheets = args.filter(a => !a.startsWith('--'));

  console.log(dryRun ? 'DRY RUN — без записи в БД' : 'ИМПОРТ — запись в БД');
  console.log('');

  const result = await importFromSheets({
    sheets: sheets.length > 0 ? sheets : undefined,
    dryRun,
  });

  console.log('\n=== Результат ===');
  for (const [key, r] of Object.entries(result)) {
    if (r.error) {
      console.log(`  ${key}: ОШИБКА — ${r.error}`);
    } else if (r.skipped) {
      console.log(`  ${key}: ПРОПУЩЕНО — ${r.reason}`);
    } else if (r.upserted !== undefined) {
      const extra = r.playersUpdated !== undefined ? ` (${r.playersUpdated} MMR синхронизировано)` : '';
      console.log(`  ${key}: ${r.upserted} записей обновлено${extra}`);
    } else if (r.inserted !== undefined) {
      console.log(`  ${key}: ${r.inserted} записей добавлено`);
    } else if (r.parsed !== undefined) {
      console.log(`  ${key}: ${r.parsed} записей распознано (dry-run)`);
    }
  }
}
