import { useState } from 'react';
import {
  getTemplates,
  addTaskTemplate,
  updateTaskTemplate,
  removeTaskTemplate,
  addComplicationTemplate,
  updateComplicationTemplate,
  removeComplicationTemplate,
  resetTemplates,
} from '../state/templateStore.js';

export default function Templates({
  overlayTasks = [],
  overlayComplications = [],
  onAddTask,
  onRemoveTask,
  onAddComplication,
  onRemoveComplication,
}) {
  const [templates, setTemplates] = useState(() => getTemplates());
  const [taskText, setTaskText] = useState('');
  const [taskPoints, setTaskPoints] = useState(1);
  const [compText, setCompText] = useState('');
  const [editingTask, setEditingTask] = useState(null); // { id, text, points }
  const [editingComp, setEditingComp] = useState(null); // { id, text }

  function refresh() {
    setTemplates(getTemplates());
  }

  function handleAddTask(e) {
    e.preventDefault();
    if (!taskText.trim()) return;
    const updated = addTaskTemplate(taskText.trim(), taskPoints);
    setTemplates(updated);
    setTaskText('');
    setTaskPoints(1);
  }

  function handleDeleteTask(id) {
    const updated = removeTaskTemplate(id);
    setTemplates(updated);
    if (editingTask?.id === id) setEditingTask(null);
    // Also remove from overlay if present
    const overlayMatch = overlayTasks.find((t) => t.text === templates.tasks.find((tp) => tp.id === id)?.text);
    if (overlayMatch && onRemoveTask) onRemoveTask(overlayMatch.id);
  }

  function handleEditTask(task) {
    setEditingTask({ ...task });
  }

  function handleSaveTaskEdit() {
    if (!editingTask || !editingTask.text.trim()) return;
    const updated = updateTaskTemplate(editingTask.id, {
      text: editingTask.text.trim(),
      points: editingTask.points,
    });
    setTemplates(updated);
    setEditingTask(null);
  }

  function handleCancelEdit() {
    setEditingTask(null);
  }

  function handleAddComp(e) {
    e.preventDefault();
    if (!compText.trim()) return;
    const updated = addComplicationTemplate(compText.trim());
    setTemplates(updated);
    setCompText('');
  }

  function handleEditComp(comp) {
    setEditingComp({ ...comp });
  }

  function handleSaveCompEdit() {
    if (!editingComp || !editingComp.text.trim()) return;
    const updated = updateComplicationTemplate(editingComp.id, { text: editingComp.text.trim() });
    setTemplates(updated);
    setEditingComp(null);
  }

  function handleCancelCompEdit() {
    setEditingComp(null);
  }

  function handleDeleteComp(id) {
    const updated = removeComplicationTemplate(id);
    setTemplates(updated);
    if (editingComp?.id === id) setEditingComp(null);
    // Also remove from overlay if present
    const overlayMatch = overlayComplications.find((c) => c.text === templates.complications.find((cp) => cp.id === id)?.text);
    if (overlayMatch && onRemoveComplication) onRemoveComplication(overlayMatch.id);
  }

  function handleReset() {
    if (!window.confirm('Сбросить все шаблоны до стандартных? Созданные шаблоны будут удалены.')) return;
    const updated = resetTemplates();
    setTemplates(updated);
  }

  // Check if a template task is already in the overlay
  function isTaskInOverlay(taskText) {
    return overlayTasks.some((t) => t.text === taskText);
  }

  // Check if a template complication is already in the overlay
  function isCompInOverlay(compText) {
    return overlayComplications.some((c) => c.text === compText);
  }

  // Toggle task in overlay via checkbox
  function handleToggleTask(tpl) {
    if (isTaskInOverlay(tpl.text)) {
      // Remove from overlay
      const match = overlayTasks.find((t) => t.text === tpl.text);
      if (match && onRemoveTask) onRemoveTask(match.id);
    } else {
      // Add to overlay
      if (onAddTask) onAddTask(tpl.text, tpl.points);
    }
  }

  // Toggle complication in overlay via checkbox
  function handleToggleComp(tpl) {
    if (isCompInOverlay(tpl.text)) {
      // Remove from overlay
      const match = overlayComplications.find((c) => c.text === tpl.text);
      if (match && onRemoveComplication) onRemoveComplication(match.id);
    } else {
      // Add to overlay
      if (onAddComplication) onAddComplication(tpl.text);
    }
  }

  return (
    <main className="templates-shell">
      <header className="templates-header tech-panel">
        <div>
          <p className="eyebrow">Управление шаблонами</p>
          <h2>Библиотека заданий и усложнений</h2>
        </div>
        <button type="button" onClick={handleReset} className="btn-reset">
          Сбросить к стандартным
        </button>
      </header>

      <section className="templates-grid">
        {/* --- Шаблоны заданий --- */}
        <section className="admin-card tech-panel">
          <p className="eyebrow">Шаблоны заданий</p>
          <h3>Задачи ({templates.tasks.length})</h3>

          <form className="template-add-form" onSubmit={handleAddTask}>
            <textarea
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="Текст задания..."
              rows={2}
            />
            <div className="template-add-controls">
              <label>
                Очки
                <div className="task-points-stepper">
                  <button type="button" onClick={() => setTaskPoints(Math.max(0, taskPoints - 1))}>−</button>
                  <span>{taskPoints}</span>
                  <button type="button" onClick={() => setTaskPoints(taskPoints + 1)}>+</button>
                </div>
              </label>
              <button type="submit" disabled={!taskText.trim()}>Добавить</button>
            </div>
          </form>

          <div className="template-list">
            {templates.tasks.map((tpl) => (
              <article key={tpl.id} className={editingTask?.id === tpl.id ? 'editing' : ''}>
                {editingTask?.id === tpl.id ? (
                  <div className="template-edit-fields">
                    <textarea
                      value={editingTask.text}
                      onChange={(e) => setEditingTask({ ...editingTask, text: e.target.value })}
                      rows={2}
                      autoFocus
                    />
                    <div className="template-edit-row">
                      <label>
                        Очки
                        <div className="task-points-stepper">
                          <button type="button" onClick={() => setEditingTask({ ...editingTask, points: Math.max(0, editingTask.points - 1) })}>−</button>
                          <span>{editingTask.points}</span>
                          <button type="button" onClick={() => setEditingTask({ ...editingTask, points: editingTask.points + 1 })}>+</button>
                        </div>
                      </label>
                      <div className="button-pair">
                        <button type="button" onClick={handleSaveTaskEdit} disabled={!editingTask.text.trim()}>Сохранить</button>
                        <button type="button" onClick={handleCancelEdit}>Отмена</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="template-row">
                    <label className="template-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isTaskInOverlay(tpl.text)}
                        onChange={() => handleToggleTask(tpl)}
                        title="Добавить / убрать из Оверлея"
                      />
                    </label>
                    <div className="template-info">
                      <span className="template-text">{tpl.text}</span>
                      <span className="template-points">{tpl.points} очк.</span>
                    </div>
                    <div className="button-pair">
                      <button type="button" onClick={() => handleEditTask(tpl)} title="Редактировать">✎</button>
                      <button type="button" className="icon-danger" onClick={() => handleDeleteTask(tpl.id)} title="Удалить">×</button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* --- Шаблоны усложнений --- */}
        <section className="admin-card tech-panel">
          <p className="eyebrow">Шаблоны усложнений</p>
          <h3>Усложнения ({templates.complications.length})</h3>

          <form className="template-add-form" onSubmit={handleAddComp}>
            <textarea
              value={compText}
              onChange={(e) => setCompText(e.target.value)}
              placeholder="Текст усложнения..."
              rows={2}
            />
            <div className="template-add-controls">
              <button type="submit" disabled={!compText.trim()}>Добавить</button>
            </div>
          </form>

          <div className="template-list">
            {templates.complications.map((tpl) => (
              <article key={tpl.id} className={editingComp?.id === tpl.id ? 'editing' : ''}>
                {editingComp?.id === tpl.id ? (
                  <div className="template-edit-fields">
                    <textarea
                      value={editingComp.text}
                      onChange={(e) => setEditingComp({ ...editingComp, text: e.target.value })}
                      rows={2}
                      autoFocus
                    />
                    <div className="template-edit-row">
                      <div className="button-pair">
                        <button type="button" onClick={handleSaveCompEdit} disabled={!editingComp.text.trim()}>Сохранить</button>
                        <button type="button" onClick={handleCancelCompEdit}>Отмена</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="template-row">
                    <label className="template-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isCompInOverlay(tpl.text)}
                        onChange={() => handleToggleComp(tpl)}
                        title="Добавить / убрать из Оверлея"
                      />
                    </label>
                    <div className="template-info">
                      <span className="template-text">{tpl.text}</span>
                    </div>
                    <div className="button-pair">
                      <button type="button" onClick={() => handleEditComp(tpl)} title="Редактировать">✎</button>
                      <button type="button" className="icon-danger" onClick={() => handleDeleteComp(tpl.id)} title="Удалить">×</button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
