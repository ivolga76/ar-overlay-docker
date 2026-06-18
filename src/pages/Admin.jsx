import { useState, useEffect, useCallback } from 'react';
import { useTournament } from '../state/TournamentContext.jsx';
import AdminOverlayTab from './AdminOverlayTab.jsx';
import Templates from './Templates.jsx';
import Settings from './Settings.jsx';
import LayoutEditor from './LayoutEditor.jsx';
import { playParticipantSwitch, playRoundChange } from '../utils/sounds.js';

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
    resetTournament,
    addComplication,
    updateComplication,
    removeComplication,
  } = useTournament();

  const [activeTab, setActiveTab] = useState('overlay');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  // Export/import
  const handleExport = useCallback(() => {
    const raw = localStorage.getItem('battle-for-respect:v1');
    const blob = new Blob([raw || '{}'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arc-raiders-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          JSON.parse(re.target.result);
          localStorage.setItem('battle-for-respect:v1', re.target.result);
          window.location.reload();
        } catch {
          alert('Неверный формат файла');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

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
          <a href="/overlay" target="_blank" rel="noreferrer">
            Открыть overlay
          </a>
          <button type="button" onClick={toggleStandings}>
            {state.showStandings ? 'Скрыть таблицу' : 'Показать таблицу'}
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
              className={`sidebar-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
              title="Настройки"
            >
              <span className="sidebar-icon">⚙</span>
              <span className="sidebar-label">Настройки</span>
            </button>
          </nav>
        </aside>

        {/* --- CONTENT --- */}
        <section className="admin-content">
          {activeTab === 'overlay' ? (
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
              resetTournament={resetTournament}
              addComplication={addComplication}
              updateComplication={updateComplication}
              removeComplication={removeComplication}
              setActiveTab={setActiveTab}
              handleExport={handleExport}
              handleImport={handleImport}
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
          ) : (
            <Settings />
          )}
        </section>
      </div>
    </main>
  );
}