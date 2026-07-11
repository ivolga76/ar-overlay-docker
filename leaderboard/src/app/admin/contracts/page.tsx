'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSeasons, getContracts } from '@/lib/api';
import { getApiBase, getAdminToken } from '@/lib/admin-helpers';

const CATEGORIES = ['pve', 'pvp', 'pvpve', 'boosty'];

function getToken() { return getAdminToken(); }

export default function AdminContractsPage() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: 'pve', text: '', points: 2, is_legendary: false, boosty_author: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    getSeasons().then(list => { setSeasons(list); if (list.length > 0) setSeasonId(list[0].id); });
  }, []);

  const loadContracts = useCallback(async () => {
    if (!seasonId) return;
    setLoading(true);
    try {
      const data = await getContracts(seasonId);
      setContracts(data);
    } catch { setContracts([]); }
    setLoading(false);
  }, [seasonId]);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    try {
      const res = await fetch(`${getApiBase()}/api/seasons/${seasonId}/contracts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, is_legendary: form.is_legendary ? 1 : 0 }),
      });
      if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error);
      setShowAdd(false);
      setForm({ category: 'pve', text: '', points: 2, is_legendary: false, boosty_author: '' });
      loadContracts();
    } catch (err: any) { alert(err.message); }
  }

  async function handleUpdate(cid: string) {
    const token = getToken();
    try {
      const body: any = {};
      if (editForm.text !== undefined) body.text = editForm.text;
      if (editForm.points !== undefined) body.points = editForm.points;
      if (editForm.category !== undefined) body.category = editForm.category;
      if (editForm.is_legendary !== undefined) body.is_legendary = editForm.is_legendary ? 1 : 0;
      if (editForm.boosty_author !== undefined) body.boosty_author = editForm.boosty_author;
      const res = await fetch(`${getApiBase()}/api/seasons/${seasonId}/contracts/${cid}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error);
      setEditId(null);
      loadContracts();
    } catch (err: any) { alert(err.message); }
  }

  async function handleDelete(cid: string) {
    if (!confirm('Удалить контракт?')) return;
    const token = getToken();
    try {
      await fetch(`${getApiBase()}/api/seasons/${seasonId}/contracts/${cid}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      loadContracts();
    } catch (err: any) { alert(err.message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading-section">Контракты</h1>
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
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="bg-bg-primary border border-[rgba(234, 224, 205,0.2)] rounded px-2 py-1.5 text-sm">
            {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
          <input value={form.text} onChange={e => setForm({...form, text: e.target.value})} className="bg-bg-primary border border-[rgba(234, 224, 205,0.2)] rounded px-2 py-1.5 text-sm w-96" placeholder="Текст контракта" required />
          <input type="number" value={form.points} onChange={e => setForm({...form, points: +e.target.value})} className="bg-bg-primary border border-[rgba(234, 224, 205,0.2)] rounded px-2 py-1.5 text-sm w-16" min={1} />
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={form.is_legendary} onChange={e => setForm({...form, is_legendary: e.target.checked})} /> Легендарный</label>
          <button type="submit" className="btn-primary text-sm">Добавить</button>
          <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Отмена</button>
        </form>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">{[1,2,3,4].map(i => <div key={i} className="skeleton w-full h-12" />)}</div>
      ) : (
        <div className="flex flex-col gap-1">
          {contracts.map(c => (
            <div key={c.id} className="dark-panel p-3 flex items-center gap-3 text-sm">
              <span className={`chip text-[10px] ${c.category === 'pve' ? 'chip-primary' : c.category === 'pvp' ? 'chip-cyan' : c.category === 'pvpve' ? 'chip-gold' : 'bg-[rgba(255,255,255,0.05)] text-text-muted'}`}>
                {c.category}
              </span>
              {c.is_legendary ? <span className="chip chip-gold text-[10px]">★</span> : null}
              {editId === c.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input value={editForm.text || ''} onChange={e => setEditForm({...editForm, text: e.target.value})} className="flex-1 bg-bg-primary border border-[rgba(234, 224, 205,0.2)] rounded px-2 py-1 text-sm" />
                  <input type="number" value={editForm.points || 1} onChange={e => setEditForm({...editForm, points: +e.target.value})} className="w-14 bg-bg-primary border border-[rgba(234, 224, 205,0.2)] rounded px-2 py-1 text-sm" />
                  <button onClick={() => handleUpdate(c.id)} className="btn-ghost text-xs px-2">✓</button>
                  <button onClick={() => setEditId(null)} className="btn-ghost text-xs px-2">✕</button>
                </div>
              ) : (
                <>
                  <span className="flex-1 truncate text-text-body">{c.text}</span>
                  <span className="mono-stat text-xs text-text-muted w-8 text-right">{c.points}pt</span>
                  <button onClick={() => { setEditId(c.id); setEditForm(c); }} className="btn-ghost text-xs px-2">✎</button>
                  <button onClick={() => handleDelete(c.id)} className="btn-ghost text-xs px-2 text-danger">✕</button>
                </>
              )}
            </div>
          ))}
          {contracts.length === 0 && <p className="text-text-muted text-sm py-10 text-center">Нет контрактов</p>}
        </div>
      )}
    </div>
  );
}
