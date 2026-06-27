import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../state/AuthContext.jsx';
import { getContracts, addContract, updateContract, deleteContract } from '../utils/apiClient.js';
import { getStoredSeasonId } from './Settings.jsx';

const CATEGORIES = [
  { value: 'pve', label: 'PvE' },
  { value: 'pvp', label: 'PvP' },
  { value: 'pvpve', label: 'PvPvE' },
  { value: 'boosty', label: 'Boosty' },
];

const CATEGORY_COLORS = {
  pve: 'var(--green)',
  pvp: 'var(--danger)',
  pvpve: 'var(--orange)',
  boosty: 'var(--magenta)',
};

export default function ContractsTab() {
  const { token } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form
  const [formCategory, setFormCategory] = useState('pve');
  const [formText, setFormText] = useState('');
  const [formPoints, setFormPoints] = useState(2);
  const [formBoostyAuthor, setFormBoostyAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Debounce refs for inline editing
  const debounceTimers = useRef({});

  const load = useCallback(async () => {
    if (!token) return;
    const seasonId = getStoredSeasonId();
    try {
      setError(null);
      const list = await getContracts(seasonId, token, filterCategory || undefined, false);
      setContracts(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, filterCategory]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setFormCategory('pve');
    setFormText('');
    setFormPoints(2);
    setFormBoostyAuthor('');
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formText.trim()) return;
    setSubmitting(true);
    try {
      await addContract(getStoredSeasonId(), {
        category: formCategory,
        text: formText.trim(),
        points: formPoints,
        is_legendary: false,
        boosty_author: formBoostyAuthor || null,
      }, token);
      resetForm();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Inline update with debounce
  const scheduleUpdate = (contractId, fields) => {
    if (debounceTimers.current[contractId]) {
      clearTimeout(debounceTimers.current[contractId]);
    }
    debounceTimers.current[contractId] = setTimeout(async () => {
      try {
        await updateContract(getStoredSeasonId(), contractId, fields, token);
      } catch (e) {
        setError(e.message);
      }
    }, 400);
  };

  const handleTextChange = (contractId, text) => {
    setContracts((prev) =>
      prev.map((c) => (c.id === contractId ? { ...c, text } : c))
    );
    scheduleUpdate(contractId, { text });
  };

  const handlePointsChange = (contractId, delta) => {
    setContracts((prev) =>
      prev.map((c) => {
        if (c.id !== contractId) return c;
        const newPoints = Math.max(1, (c.points || 1) + delta);
        scheduleUpdate(contractId, { points: newPoints });
        return { ...c, points: newPoints };
      })
    );
  };

  const handleCategoryChange = (contractId, category) => {
    setContracts((prev) =>
      prev.map((c) => (c.id === contractId ? { ...c, category } : c))
    );
    scheduleUpdate(contractId, { category });
  };

  const handleBoostyAuthorChange = (contractId, boosty_author) => {
    setContracts((prev) =>
      prev.map((c) => (c.id === contractId ? { ...c, boosty_author } : c))
    );
    scheduleUpdate(contractId, { boosty_author: boosty_author || null });
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить контракт?')) return;
    try {
      await deleteContract(getStoredSeasonId(), id, token);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const categoryLabel = (cat) => {
    const found = CATEGORIES.find((c) => c.value === cat);
    return found ? found.label : cat;
  };

  if (loading) {
    return (
      <section className="admin-card tech-panel" style={{ padding: 20 }}>
        <p style={{ color: 'var(--muted)' }}>Загрузка контрактов…</p>
      </section>
    );
  }

  return (
    <section className="admin-card tech-panel">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Пул контрактов сезона</p>
          <h2>📋 Контракты ({contracts.length})</h2>
        </div>
        <div className="button-pair">
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setLoading(true); }}
            style={{ padding: '6px 10px', fontSize: 13 }}
          >
            <option value="">Все категории</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="roulette-btn"
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            style={{ padding: '6px 14px', fontSize: 13 }}
          >
            {showForm ? 'Отмена' : '+ Контракт'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '8px 0', color: 'var(--danger)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10, padding: '10px 0', marginBottom: 8
        }}>
          <div /> {/* spacer matching checkbox column */}
          <div className="task-edit-fields">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: 13, minWidth: 90 }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Название и описание контракта"
                  required
                  autoFocus
                  style={{ flex: 1, minWidth: 200, padding: '4px 8px', fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--muted)' }}>
                  Баллы
                  <input
                    type="number"
                    value={formPoints}
                    onChange={(e) => setFormPoints(Math.max(1, parseInt(e.target.value) || 2))}
                    min={1} max={10}
                    style={{ width: 56, padding: '4px 6px', textAlign: 'center' }}
                  />
                </label>
                {formCategory === 'boosty' && (
                  <input
                    type="text"
                    value={formBoostyAuthor}
                    onChange={(e) => setFormBoostyAuthor(e.target.value)}
                    placeholder="Автор (Boosty)"
                    style={{ padding: '4px 8px', fontSize: 13, width: 150 }}
                  />
                )}
                <button type="submit" className="roulette-btn" disabled={submitting} style={{ padding: '6px 14px', fontSize: 13 }}>
                  {submitting ? 'Сохранение…' : 'Добавить'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {contracts.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
          Нет контрактов в этой категории.
        </div>
      ) : (
        <div className="admin-task-list">
          {contracts.map((c) => (
            <div className="task-item" key={c.id}>
              <label style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
                <span
                  title={categoryLabel(c.category)}
                  style={{
                    display: 'inline-block',
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: CATEGORY_COLORS[c.category] || 'var(--muted)',
                    boxShadow: `0 0 8px ${CATEGORY_COLORS[c.category] || 'var(--muted)'}`,
                    flexShrink: 0,
                  }}
                />
              </label>
              <div className="task-edit-fields">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <textarea
                    value={c.text}
                    rows="2"
                    onChange={(e) => handleTextChange(c.id, e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      value={c.category}
                      onChange={(e) => handleCategoryChange(c.id, e.target.value)}
                      style={{ fontSize: 11, padding: '2px 4px', background: 'rgba(0,0,0,0.3)', color: 'var(--muted)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                    {c.boosty_author && (
                      <span style={{ fontSize: 11, color: 'var(--magenta)' }}>
                        от{' '}
                        <input
                          type="text"
                          value={c.boosty_author}
                          onChange={(e) => handleBoostyAuthorChange(c.id, e.target.value)}
                          style={{
                            fontSize: 11, padding: '1px 4px', width: 100,
                            background: 'rgba(0,0,0,0.3)', color: 'var(--magenta)',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        />
                      </span>
                    )}
                  </div>
                </div>
                <span>
                  Баллы
                  <div className="task-points-stepper">
                    <button type="button" onClick={() => handlePointsChange(c.id, -1)}>−</button>
                    <span>{c.points ?? 1}</span>
                    <button type="button" onClick={() => handlePointsChange(c.id, 1)}>+</button>
                    <button type="button" onClick={() => handleDelete(c.id)} title="Удалить контракт">×</button>
                  </div>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
