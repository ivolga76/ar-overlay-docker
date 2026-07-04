'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAdminPlayers, updatePlayer } from '@/lib/api';

function getToken() {
  const match = document.cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  return match ? match[1] : '';
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editName, setEditName] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const data = await getAdminPlayers(token, search || undefined);
      setPlayers(data.players);
      setTotal(data.total);
    } catch { setPlayers([]); }
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(p: any) {
    const id = p.id || p.display_name;
    try {
      const token = getToken();
      const body: any = {};
      if (editForm.display_name !== undefined && editForm.display_name !== p.display_name) body.display_name = editForm.display_name;
      if (editForm.embark_id !== undefined && editForm.embark_id !== (p.embark_id || '')) body.embark_id = editForm.embark_id;
      if (editForm.discord_name !== undefined && editForm.discord_name !== (p.discord_name || '')) body.discord_name = editForm.discord_name;
      if (Object.keys(body).length === 0) { setEditName(null); return; }
      await updatePlayer(id, { ...body, display_name: editForm.display_name || p.display_name }, token);
      setEditName(null);
      load();
    } catch (err: any) { alert(err.message); }
  }

  function startEdit(p: any) {
    setEditName(p.display_name);
    setEditForm({
      display_name: p.display_name || '',
      embark_id: p.embark_id || '',
      discord_name: p.discord_name || '',
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading-section">Игроки ({total})</h1>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-bg-secondary border border-[rgba(96,128,255,0.2)] rounded px-3 py-1.5 text-sm w-48"
            placeholder="Поиск по имени..."
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton w-full h-12" />)}</div>
      ) : (
        <div className="flex flex-col gap-1">
          {players.map(p => (
            <div key={p.display_name} className="dark-panel p-3 flex items-center gap-3 text-sm">
              <span className="font-heading font-bold text-text-primary w-48 truncate">{p.display_name}</span>

              {editName === p.display_name ? (
                <div className="flex-1 flex items-center gap-2">
                  <input value={editForm.display_name} onChange={e => setEditForm({...editForm, display_name: e.target.value})} className="bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm w-36" placeholder="Имя" />
                  <input value={editForm.embark_id} onChange={e => setEditForm({...editForm, embark_id: e.target.value})} className="bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm w-44" placeholder="Embark ID" />
                  <input value={editForm.discord_name} onChange={e => setEditForm({...editForm, discord_name: e.target.value})} className="bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm w-36" placeholder="Discord" />
                  <button onClick={() => handleSave(p)} className="btn-ghost text-xs px-2">✓</button>
                  <button onClick={() => setEditName(null)} className="btn-ghost text-xs px-2">✕</button>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-4 text-xs text-text-muted">
                  {p.embark_id ? <span>Embark: {p.embark_id}</span> : <span className="opacity-40">Embark ID: —</span>}
                  {p.discord_name ? <span>Discord: {p.discord_name}</span> : <span className="opacity-40">Discord: —</span>}
                  <span className="opacity-40">Турниров: {p.tournament_count || 0}</span>
                  <button onClick={() => startEdit(p)} className="btn-ghost text-xs px-2 ml-auto">✎</button>
                </div>
              )}
            </div>
          ))}
          {players.length === 0 && <p className="text-text-muted text-sm py-10 text-center">Нет игроков</p>}
        </div>
      )}
    </div>
  );
}
