'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSeasons } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  const match = document.cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  return match ? match[1] : '';
}

export default function AdminSeasonsPage() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSeasons();
      setSeasons(data);
    } catch { setSeasons([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/api/seasons`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: `admin_token=${token}` },
        body: JSON.stringify({ id: formId.trim(), name: formName.trim(), description: formDesc.trim() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error);
      setShowCreate(false); setFormId(''); setFormName(''); setFormDesc('');
      load();
    } catch (err: any) { setError(err.message); }
  }

  async function handleUpdate(seasonId: string) {
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/api/seasons/${seasonId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: `admin_token=${token}` },
        body: JSON.stringify({ status: editStatus }),
      });
      if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error);
      setEditId(null);
      load();
    } catch (err: any) { setError(err.message); }
  }

  if (loading) {
    return <div className="py-10"><div className="skeleton w-60 h-6 mb-4" /><div className="skeleton w-full h-40" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading-section">Сезоны</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm">
          + Создать сезон
        </button>
      </div>

      {error && <p className="text-xs text-danger mb-4">{error}</p>}

      {showCreate && (
        <form onSubmit={handleCreate} className="dark-panel p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[10px] uppercase text-text-muted mb-1">ID</label>
            <input value={formId} onChange={e => setFormId(e.target.value)} className="bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1.5 text-sm w-32" placeholder="season-3" required />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-text-muted mb-1">Название</label>
            <input value={formName} onChange={e => setFormName(e.target.value)} className="bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1.5 text-sm w-48" placeholder="Season 3" required />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-text-muted mb-1">Описание</label>
            <input value={formDesc} onChange={e => setFormDesc(e.target.value)} className="bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1.5 text-sm w-64" />
          </div>
          <button type="submit" className="btn-primary text-sm">Создать</button>
          <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost text-sm">Отмена</button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {seasons.map((s) => (
          <div key={s.id} className="dark-panel p-4 flex items-center justify-between">
            <div>
              <p className="font-heading font-bold text-text-primary">{s.name}</p>
              <p className="text-xs text-text-muted">{s.id} · {s.description || '—'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`chip ${s.status === 'active' ? 'chip-primary' : 'bg-[rgba(255,255,255,0.05)] text-text-muted'}`}>
                {s.status === 'active' ? 'Активен' : 'Архив'}
              </span>
              {editId === s.id ? (
                <div className="flex items-center gap-2">
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-xs">
                    <option value="active">Активен</option>
                    <option value="archived">Архив</option>
                  </select>
                  <button onClick={() => handleUpdate(s.id)} className="btn-ghost text-xs">✓</button>
                  <button onClick={() => setEditId(null)} className="btn-ghost text-xs">✕</button>
                </div>
              ) : (
                <button onClick={() => { setEditId(s.id); setEditStatus(s.status); }} className="btn-ghost text-xs">
                  Изменить
                </button>
              )}
            </div>
          </div>
        ))}
        {seasons.length === 0 && <p className="text-text-muted text-sm py-10 text-center">Нет сезонов</p>}
      </div>
    </div>
  );
}
