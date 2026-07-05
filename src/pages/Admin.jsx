import { useState, useEffect, useCallback } from 'react';
import { useTournament } from '../state/TournamentContext.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import AdminOverlayTab from './AdminOverlayTab.jsx';
import Templates from './Templates.jsx';
import Settings from './Settings.jsx';
import LayoutEditor from './LayoutEditor.jsx';
import TournamentsList from './TournamentsList.jsx';
import ContractsTab from './ContractsTab.jsx';
import ProtocolsTab from './ProtocolsTab.jsx';
import LegendaryTab from './LegendaryTab.jsx';
import { playParticipantSwitch, playRoundChange } from '../utils/sounds.js';
import { createTournament, getSeasons } from '../utils/apiClient.js';

export default function Admin() {
  const {
    state,
    participants,
    currentParticipant,
    standings,
    syncingFromServer,
    setMode,
    setRound,
    selectParticipant,
    updateCurrentName,
    adjustPoints,
    setCurrentPoints,
    updateTask,
    addTask,
    removeTask,
    addPlayer,
    addTeam,
    removeParticipant,
    toggleStandings,
    toggleWidgetVisibility,
    resetTournament,
    addComplication,
    updateComplication,
    removeComplication,
    spinRoulette,
    setRouletteItems,
    resetTasks,
  } = useTournament();

  const [activeTab, setActiveTab] = useState('overlay');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { logout, user, token } = useAuth();

  // ── New tournament modal state ────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTournamentMode, setNewTournamentMode] = useState('1x1');
  const [newTournamentType, setNewTournamentType] = useState('pve');
  const [newTournamentRounds, setNewTournamentRounds] = useState(1);
  const [newTournamentSeasonId, setNewTournamentSeasonId] = useState('');
  const [newTournamentName, setNewTournamentName] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [seasons, setSeasons] = useState([]);

  // Load seasons for the modal
  useEffect(() => {
    if (!token) return;
    getSeasons(token).then((list) => {
      setSeasons(list);
      // Default to the active season (season-2 is expected)
      const active = list.filter((s) => s.status === 'active');
      if (active.length > 0 && !newTournamentSeasonId) {
        setNewTournamentSeasonId(active[active.length - 1].id);
      }
    }).catch(() => {});
  }, [token]);

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    const name = newTournamentName.trim() || `Турнир ${new Date().toLocaleDateString('ru-RU')}`;
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createTournament({
        name,
        mode: newTournamentMode,
        totalRounds: newTournamentRounds,
        season_id: newTournamentSeasonId || undefined,
      }, token);
      setShowCreateModal(false);
      setNewTournamentName('');
      setNewTournamentMode('1x1');
      setNewTournamentType('pve');
      setNewTournamentRounds(1);
      setActiveTab('tournaments');
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Keyboard: Arrow keys switch participants, +/- adjust points
  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      const idx = participants.findIndex(p => p.id === state.currentParticipantId);
      if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        selectParticipant(participants[idx - 1].id);
      }
      if (e.key === 'ArrowDown' && idx < participants.length - 1) {
        e.preventDefault();
        selectParticipant(participants[idx + 1].id);
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        adjustPoints(1);
      }
      if (e.key === '-') {
        e.preventDefault();
        adjustPoints(-1);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [participants, state.currentParticipantId, selectParticipant, adjustPoints]);

  // Sound effects — only on real user actions, not WebSocket sync
  useEffect(() => {
    if (syncingFromServer.current) return;
    playParticipantSwitch();
  }, [state.currentParticipantId]);
  useEffect(() => {
    if (syncingFromServer.current) return;
    playRoundChange();
  }, [state.currentRound]);

  // Export/import — uses server API instead of localStorage
  const API_BASE = window.location.origin;

  const handleExport = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/state/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Ошибка экспорта');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ar-overlay-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Ошибка сети при экспорте');
    }
  }, [token]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        JSON.parse(text); // validate JSON
        const res = await fetch(`${API_BASE}/api/state/import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: text,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Ошибка импорта');
          return;
        }
        window.location.reload();
      } catch (err) {
        alert(err.message || 'Неверный формат файла');
      }
    };
    input.click();
  }, [token]);

  // Overlay state for template checkboxes
  const overlayTasks = state.tasks;
  const overlayComplications = state.extensions?.complications || [];

  return (
    <main className="admin-shell">
      <header className="admin-header tech-panel">
        <div>
          <p className="eyebrow">Arc Raiders overlay control</p>
          <h1>Битва за Респект</h1>
        </div>
        <nav>
          <button
            type="button"
            className="overlay-link-btn"
            onClick={() => setShowCreateModal(true)}
            title="Создать новый турнир"
          >
            Новый турнир
          </button>
          <a href={`/overlay/${user.id}`} target="_blank" rel="noreferrer">
            Открыть overlay
          </a>
          <button
            type="button"
            className="copy-link-btn"
            title="Скопировать ссылку на оверлей"
            onClick={() => {
              const url = `${window.location.origin}/overlay/${user.id}`;
              if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(url).catch(() => fallbackCopy(url));
              } else {
                fallbackCopy(url);
              }
              function fallbackCopy(text) {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
              }
            }}
          >
            ⧉
          </button>
        </nav>
      </header>

      <div className="admin-layout">
        {/* --- SIDEBAR --- */}
        <aside className={`admin-sidebar tech-panel${sidebarCollapsed ? ' collapsed' : ''}`}>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            title={sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
          <nav className="sidebar-nav">
            <button
              type="button"
              className={`sidebar-tab ${activeTab === 'tournaments' ? 'active' : ''}`}
              onClick={() => setActiveTab('tournaments')}
              title="Турниры"
            >
              <span className="sidebar-icon">🏆</span>
              <span className="sidebar-label">Турниры</span>
            </button>
            <button
              type="button"
              className={`sidebar-tab ${activeTab === 'overlay' ? 'active' : ''}`}
              onClick={() => setActiveTab('overlay')}
              title="Оверлей"
            >
              <span className="sidebar-icon">▣</span>
              <span className="sidebar-label">Оверлей</span>
            </button>
            <button
              type="button"
              className={`sidebar-tab ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('templates')}
              title="Шаблоны"
            >
              <span className="sidebar-icon">☰</span>
              <span className="sidebar-label">Шаблоны</span>
            </button>
            <button
              type="button"
              className={`sidebar-tab ${activeTab === 'layout' ? 'active' : ''}`}
              onClick={() => setActiveTab('layout')}
              title="Расстановка"
            >
              <span className="sidebar-icon">⊞</span>
              <span className="sidebar-label">Расстановка</span>
            </button>
            <button
              type="button"
              className={`sidebar-tab ${activeTab === 'contracts' ? 'active' : ''}`}
              onClick={() => setActiveTab('contracts')}
              title="Контракты Сезона 2"
            >
              <span className="sidebar-icon">📋</span>
              <span className="sidebar-label">Контракты</span>
            </button>
            <button
              type="button"
              className={`sidebar-tab ${activeTab === 'protocols' ? 'active' : ''}`}
              onClick={() => setActiveTab('protocols')}
              title="Протоколы Сезона 2"
            >
              <span className="sidebar-icon">⚠️</span>
              <span className="sidebar-label">Протоколы</span>
            </button>
            <button
              type="button"
              className={`sidebar-tab ${activeTab === 'legendary' ? 'active' : ''}`}
              onClick={() => setActiveTab('legendary')}
              title="Легендарные контракты"
            >
              <span className="sidebar-icon">🏆</span>
              <span className="sidebar-label">Легендарные</span>
            </button>

            <button
              type="button"
              className={`sidebar-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
              title="Настройки"
            >
              <span className="sidebar-icon">⚙</span>
              <span className="sidebar-label">Настройки</span>
            </button>

            <hr className="sidebar-divider" />

            <button
              type="button"
              className="sidebar-tab sidebar-logout"
              onClick={logout}
              title="Выйти из аккаунта"
            >
              <span className="sidebar-icon">⏻</span>
              <span className="sidebar-label">Выход</span>
            </button>
          </nav>
        </aside>

        {/* --- CONTENT --- */}
        <section className="admin-content">
          {activeTab === 'tournaments' ? (
            <TournamentsList />
          ) : activeTab === 'overlay' ? (
            <AdminOverlayTab
              state={state}
              participants={participants}
              currentParticipant={currentParticipant}
              standings={standings}
              setMode={setMode}
              setRound={setRound}
              selectParticipant={selectParticipant}
              updateCurrentName={updateCurrentName}
              adjustPoints={adjustPoints}
              setCurrentPoints={setCurrentPoints}
              updateTask={updateTask}
              addTask={addTask}
              removeTask={removeTask}
              addPlayer={addPlayer}
              addTeam={addTeam}
              removeParticipant={removeParticipant}
              toggleStandings={toggleStandings}
              toggleWidgetVisibility={toggleWidgetVisibility}
              resetTournament={resetTournament}
              addComplication={addComplication}
              updateComplication={updateComplication}
              removeComplication={removeComplication}
              setActiveTab={setActiveTab}
              handleExport={handleExport}
              handleImport={handleImport}
              spinRoulette={spinRoulette}
              setRouletteItems={setRouletteItems}
              resetTasks={resetTasks}
            />
          ) : activeTab === 'templates' ? (
            <Templates
              overlayTasks={overlayTasks}
              overlayComplications={overlayComplications}
              onAddTask={addTask}
              onRemoveTask={removeTask}
              onAddComplication={addComplication}
              onRemoveComplication={removeComplication}
            />
          ) : activeTab === 'layout' ? (
            <LayoutEditor />
          ) : activeTab === 'contracts' ? (
            <ContractsTab
              overlayTasks={overlayTasks}
              onAddToRound={addTask}
            />
          ) : activeTab === 'protocols' ? (
            <ProtocolsTab />
          ) : activeTab === 'legendary' ? (
            <LegendaryTab />
          ) : (
            <Settings />
          )}
        </section>
      </div>

      {/* ── New Tournament Modal ──────────────────────────── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <form
            className="modal-content tech-panel"
            style={{ maxWidth: 420, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateTournament}
          >
            <h2 style={{ fontFamily: 'var(--display-font)', margin: '0 0 16px' }}>Новый турнир</h2>

            {createError && (
              <div style={{ padding: '8px 12px', marginBottom: 12, border: '1px solid var(--danger)', borderRadius: 4, color: 'var(--danger)', fontSize: 13 }}>
                {createError}
              </div>
            )}

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span className="eyebrow">Название</span>
              <input
                type="text"
                value={newTournamentName}
                onChange={(e) => setNewTournamentName(e.target.value)}
                placeholder="Битва за Респект"
                style={{ width: '100%' }}
                autoFocus
              />
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span className="eyebrow">Режим</span>
              <select
                value={newTournamentMode}
                onChange={(e) => setNewTournamentMode(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="1x1">1×1</option>
                <option value="2x2">2×2</option>
              </select>
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span className="eyebrow">Тип</span>
              <select
                value={newTournamentType}
                onChange={(e) => setNewTournamentType(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="pve">PvE</option>
                <option value="pvp">PvP</option>
                <option value="pvpve">PvPvE</option>
              </select>
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span className="eyebrow">Количество раундов</span>
              <input
                type="number"
                min="1"
                max="10"
                value={newTournamentRounds}
                onChange={(e) => setNewTournamentRounds(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 16 }}>
              <span className="eyebrow">Сезон</span>
              <select
                value={newTournamentSeasonId}
                onChange={(e) => setNewTournamentSeasonId(e.target.value)}
                style={{ width: '100%' }}
              >
                {seasons.length === 0 && <option value="">Загрузка…</option>}
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="roulette-btn"
                onClick={() => setShowCreateModal(false)}
                style={{ padding: '8px 16px' }}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={createSubmitting}
                style={{ padding: '8px 20px' }}
              >
                {createSubmitting ? 'Создание…' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}