'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSeasons, getProtocols } from '@/lib/api';
import { getApiBase, getAdminToken } from '@/lib/admin-helpers';

function getToken() { return getAdminToken(); }

export default function AdminProtocolsPage() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ text: '', penalty_seconds: 60, boosty_author: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    getSeasons().then(list => { setSeasons(list); if (list.length > 0) setSeasonId(list[0].id); });
  }, []);

  const load = useCallback(async () => {
    if (!seasonId) return;
    setLoading(true);
    try { setProtocols(await getProtocols(seasonId)); } catch { setProtocols([]); }
    setLoading(false);
  }, [seasonId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    try {
      const res = await fetch(`${getApiBase()}/api/seasons/${seasonId}/protocols`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error);
      setShowAdd(false); setForm({ text: '', penalty_seconds: 60, boosty_author: '' });
      load();
    } catch (err: any) { alert(err.message); }
  }

  async function handleUpdate(pid: string) {
    const token = getToken();
    try {
      const body: any = {};
      if (editForm.text !== undefined) body.text = editForm.text;
      if (editForm.penalty_seconds !== undefined) body.penalty_seconds = editForm.penalty_seconds;
      const res = await fetch(`${getApiBase()}/api/seasons/${seasonId}/protocols/${pid}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error);
      setEditId(null); load();
    } catch (err: any) { alert(err.message); }
  }

  async function handleDelete(pid: string) {
    if (!confirm('Удалить протокол?')) return;
    const token = getToken();
    try {
      await fetch(`${getApiBase()}/api/seasons/${seasonId}/protocols/${pid}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      load();
    } catch (err: any) { alert(err.message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading-section">Протоколы</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm">+ Добавить</button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs text-text-muted">Сезон:</label>
        <select value={seasonId} onChange={e => setSeasonId(e.target.value)} className="bg-bg-secondary border border-[rgba(234, 224, 205,0.2)] rounded px-2 py-1 text-sm">
          {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="dark-panel p-4 mb-4 flex flex-wrap gap-3 items-end">
          <input value={form.text} onChange={e => setForm({...form, text: e.target.value})} className="bg-bg-primary border border-[rgba(234, 224, 205,0.2)] rounded px-2 py-1.5 text-sm w-96" placeholder="Текст протокола" required />
          <input type="number" value={form.penalty_seconds} onChange={e => setForm({...form, penalty_seconds: +e.target.value})} className="bg-bg-primary border border-[rgba(234, 224, 205,0.2)] rounded px-2 py-1.5 text-sm w-20" min={0} />
          <button type="submit" className="btn-primary text-sm">Добавить</button>
          <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Отмена</button>
        </form>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">{[1,2,3].map(i => <div key={i} className="skeleton w-full h-12" />)}</div>
      ) : (
        <div className="flex flex-col gap-1">
          {protocols.map(p => (
            <div key={p.id} className="dark-panel p-3 flex items-center gap-3 text-sm">
              {editId === p.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input value={editForm.text || ''} onChange={e => setEditForm({...editForm, text: e.target.value})} className="flex-1 bg-bg-primary border border-[rgba(234, 224, 205,0.2)] rounded px-2 py-1 text-sm" />
                  <input type="number" value={editForm.penalty_seconds || 0} onChange={e => setEditForm({...editForm, penalty_seconds: +e.target.value})} className="w-20 bg-bg-primary border border-[rgba(234, 224, 205,0.2)] rounded px-2 py-1 text-sm" />
                  <button onClick={() => handleUpdate(p.id)} className="btn-ghost text-xs px-2">✓</button>
                  <button onClick={() => setEditId(null)} className="btn-ghost text-xs px-2">✕</button>
                </div>
              ) : (
                <>
                  <span className="flex-1 truncate text-text-body">{p.text}</span>
                  <span className="mono-stat text-xs text-danger w-16 text-right">{p.penalty_seconds} сек</span>
                  <button onClick={() => { setEditId(p.id); setEditForm(p); }} className="btn-ghost text-xs px-2">✎</button>
                  <button onClick={() => handleDelete(p.id)} className="btn-ghost text-xs px-2 text-danger">✕</button>
                </>
              )}
            </div>
          ))}
          {protocols.length === 0 && <p className="text-text-muted text-sm py-10 text-center">Нет протоколов</p>}
        </div>
      )}
    </div>
  );
}
