import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../state/AuthContext.jsx';
import { getProtocols, addProtocol, updateProtocol, deleteProtocol } from '../utils/apiClient.js';
import { getStoredSeasonId } from './Settings.jsx';

export default function ProtocolsTab() {
  const { token } = useAuth();
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form
  const [formText, setFormText] = useState('');
  const [formPenalty, setFormPenalty] = useState(60);
  const [formBoostyAuthor, setFormBoostyAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const seasonId = getStoredSeasonId();
    try {
      setError(null);
      const list = await getProtocols(seasonId, token);
      setProtocols(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setFormText('');
    setFormPenalty(60);
    setFormBoostyAuthor('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formText.trim()) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await updateProtocol(getStoredSeasonId(), editingId, {
          text: formText.trim(),
          penalty_seconds: formPenalty,
          boosty_author: formBoostyAuthor || null,
        }, token);
      } else {
        await addProtocol(getStoredSeasonId(), {
          text: formText.trim(),
          penalty_seconds: formPenalty,
          boosty_author: formBoostyAuthor || null,
        }, token);
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (p) => {
    setFormText(p.text);
    setFormPenalty(p.penalty_seconds);
    setFormBoostyAuthor(p.boosty_author || '');
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить протокол?')) return;
    try {
      await deleteProtocol(getStoredSeasonId(), id, token);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) {
    return <div className="tech-panel" style={{ padding: 20 }}><p style={{ color: 'var(--muted)' }}>Загрузка протоколов…</p></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--display-font)', fontSize: 20 }}>
          ⚠️ Протоколы ({protocols.length})
        </h2>
        <button
          className="roulette-btn"
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          style={{ padding: '6px 14px', fontSize: 13 }}
        >
          {showForm ? 'Отмена' : '+ Протокол'}
        </button>
      </div>

      {error && (
        <div className="tech-panel" style={{ padding: 12, marginBottom: 16, borderColor: 'var(--danger)' }}>
          <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="tech-panel" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ flex: '3 1 350px' }}>
              <span className="eyebrow">Текст протокола</span>
              <input type="text" value={formText} onChange={(e) => setFormText(e.target.value)} placeholder="Ограничение для игрока" required autoFocus style={{ width: '100%' }} />
            </label>
            <label style={{ flex: '0 0 90px' }}>
              <span className="eyebrow">Штраф (сек)</span>
              <input type="number" value={formPenalty} onChange={(e) => setFormPenalty(Math.max(10, parseInt(e.target.value) || 60))} min={10} max={600} style={{ width: '100%' }} />
            </label>
            <label style={{ flex: '0 0 150px' }}>
              <span className="eyebrow">Автор (Boosty)</span>
              <input type="text" value={formBoostyAuthor} onChange={(e) => setFormBoostyAuthor(e.target.value)} placeholder="Никнейм" style={{ width: '100%' }} />
            </label>
            <button type="submit" className="roulette-btn" disabled={submitting} style={{ padding: '8px 16px' }}>
              {submitting ? 'Сохранение…' : editingId ? 'Обновить' : 'Добавить'}
            </button>
          </div>
        </form>
      )}

      {protocols.length === 0 ? (
        <div className="tech-panel" style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>Нет протоколов. Добавьте первый.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {protocols.map((p) => (
            <div key={p.id} className="tech-panel" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, wordBreak: 'break-word' }}>{p.text}</span>
                <div style={{ marginTop: 2 }}>
                  <span style={{ color: 'var(--danger)', fontSize: 12 }}>Штраф: {p.penalty_seconds} сек</span>
                  {p.boosty_author && (
                    <span style={{ color: 'var(--magenta)', fontSize: 12, marginLeft: 8 }}>от {p.boosty_author}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button className="roulette-btn" onClick={() => startEdit(p)} style={{ padding: '4px 10px', fontSize: 12 }}>✎</button>
                <button className="roulette-btn" onClick={() => handleDelete(p.id)} style={{ padding: '4px 10px', fontSize: 12, color: 'var(--danger)' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
