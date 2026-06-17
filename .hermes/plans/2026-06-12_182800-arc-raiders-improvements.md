# Arc Raiders Overlay — Improvements Plan

**Goal:** Fix critical bugs and add missing features to the tournament overlay.

**Architecture:** React 19 + Vite 6, Context API for state, localStorage sync between tabs.

---

## Priority 1 — Critical

### Task 1: Fix Chromium click handling (remove StrictMode)
- File: `src/main.jsx`
- Change: remove `<StrictMode>` wrapper
- Reason: React 19 StrictMode double-mounts in dev, breaking synthetic events in Chromium

### Task 2: Show tasks in overlay
- File: `src/pages/Overlay.jsx`
- Add: tasks grid rendering (3x2 layout with name, cost, checked state)
- File: `src/styles.css`
- Add: task tile styles for overlay

### Task 3: Add reset confirmation
- File: `src/pages/Admin.jsx`
- Change: wrap `resetTournament()` in `window.confirm()`

### Task 4: Export/import state
- File: `src/pages/Admin.jsx`
- Add: Export button (downloads JSON), Import button (file picker, parses JSON, replaces state)

---

## Priority 2 — Important

### Task 5: Prevent negative points
- File: `src/pages/Admin.jsx`
- Change: add `min="0"` to points input, clamp in `setCurrentPoints`

### Task 6: Keyboard participant switching
- File: `src/pages/Admin.jsx`
- Add: ArrowUp/ArrowDown handlers on participant area

### Task 7: Timer
- New file: `src/components/Timer.jsx`
- Add: countdown timer input + display, visible in both admin and overlay

### Task 8: Fixed overlay container
- File: `src/styles.css`
- Change: overlay from `100vw` to fixed 1920x1080 container

### Task 9: Sound effects
- New file: `src/utils/sounds.js`
- Add: Web Audio API beeps for round change and participant switch

### Task 10: Extension management
- Files: `src/pages/Admin.jsx`, `src/state/TournamentContext.jsx`
- Add: add/remove/rename for bonuses and complications

---

## Priority 3 — Polish

### Task 11: Animations
- File: `src/styles.css`
- Add: CSS transitions for name/points/round changes

### Task 12: README
- New file: `README.md`
- Add: project description, setup, usage
