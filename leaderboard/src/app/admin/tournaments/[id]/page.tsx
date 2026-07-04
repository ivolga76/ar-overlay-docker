'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getTournament } from '@/lib/api';
import { updateParticipant, updateRound } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  const match = document.cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
  return match ? match[1] : '';
}

export default function AdminTournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editPart, setEditPart] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editRound, setEditRound] = useState<string | null>(null);
  const [editRoundForm, setEditRoundForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTournament(id as string);
      setData(result);
    } catch { setData(null); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSaveParticipant(pid: string) {
    setSaving(true);
    try {
      const token = getToken();
      await updateParticipant(pid, editForm, token);
      setEditPart(null);
      load();
    } catch (err: any) { alert(err.message); }
    setSaving(false);
  }

  async function handleSaveRound(rid: string) {
    setSaving(true);
    try {
      const token = getToken();
      const fields: any = { ...editRoundForm };
      if (fields.loot_allowed !== undefined) fields.loot_allowed = fields.loot_allowed ? 1 : 0;
      await updateRound(rid, fields, token);
      setEditRound(null);
      load();
    } catch (err: any) { alert(err.message); }
    setSaving(false);
  }

  if (loading) return <div className="py-10"><div className="skeleton w-60 h-6 mb-4" /><div className="skeleton w-full h-60" /></div>;
  if (!data) return <p className="text-text-muted py-10">Турнир не найден</p>;

  const { tournament, participants = [], rounds = [], standings = [] } = data;

  const statusLabel: Record<string, string> = { draft: 'Черновик', active: 'Активен', completed: 'Завершён' };

  return (
    <div>
      <div className="mb-6">
        <a href="/admin/tournaments" className="text-xs text-text-muted hover:text-accent-primary transition-colors">← Назад к турнирам</a>
        <h1 className="heading-section mt-2">{tournament.name}</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="chip chip-primary text-xs">{tournament.mode === '1x1' ? '1×1' : '2×2'}</span>
          <span className="chip text-xs bg-[rgba(255,255,255,0.05)] text-text-muted">{statusLabel[tournament.status]}</span>
          {tournament.completed_at && <span className="text-xs text-text-muted">{new Date(tournament.completed_at).toLocaleDateString('ru-RU')}</span>}
        </div>
      </div>

      {/* Participants */}
      <div className="mb-8">
        <h2 className="heading-label mb-3">Участники ({participants.length})</h2>
        <div className="flex flex-col gap-1">
          {participants.map((p: any) => {
            const standing = standings.find((s: any) => s.participant_id === p.id);
            return (
              <div key={p.id} className="dark-panel p-3 flex items-center gap-3 text-sm">
                <span className="font-heading font-bold text-text-primary w-40 truncate">{p.name}</span>
                {p.type === 'team' && p.players && (
                  <span className="text-xs text-text-muted">{p.players.map((m: any) => m.name).join(' + ')}</span>
                )}
                {standing && (
                  <span className={`chip text-[10px] ${standing.rank === 1 ? 'chip-gold' : 'bg-[rgba(255,255,255,0.05)] text-text-muted'}`}>
                    #{standing.rank} · {standing.total_points} pts
                  </span>
                )}

                {editPart === p.id ? (
                  <div className="flex-1 flex flex-wrap items-center gap-2">
                    <input value={editForm.name || p.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm w-32" placeholder="Имя" />
                    <input value={editForm.embark_id || p.embark_id || ''} onChange={e => setEditForm({...editForm, embark_id: e.target.value})} className="bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm w-44" placeholder="Embark ID" />
                    <input value={editForm.discord_role || p.discord_role || ''} onChange={e => setEditForm({...editForm, discord_role: e.target.value})} className="bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm w-36" placeholder="Discord" />
                    <input value={editForm.amplifier || p.amplifier || ''} onChange={e => setEditForm({...editForm, amplifier: e.target.value})} className="bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm w-28" placeholder="Amplifier" />
                    <input value={editForm.shield || p.shield || ''} onChange={e => setEditForm({...editForm, shield: e.target.value})} className="bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm w-28" placeholder="Shield" />
                    <button onClick={() => handleSaveParticipant(p.id)} disabled={saving} className="btn-ghost text-xs px-2">✓</button>
                    <button onClick={() => setEditPart(null)} className="btn-ghost text-xs px-2">✕</button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center gap-3 text-xs text-text-muted">
                    {p.embark_id && <span>🎮 {p.embark_id}</span>}
                    {p.discord_role && <span>💬 {p.discord_role}</span>}
                    {p.amplifier && <span>⚡ {p.amplifier}</span>}
                    {p.shield && <span>🛡 {p.shield}</span>}
                    <button onClick={() => { setEditPart(p.id); setEditForm(p); }} className="btn-ghost text-xs px-2 ml-auto">✎ Редактировать</button>
                  </div>
                )}
              </div>
            );
          })}
          {participants.length === 0 && <p className="text-text-muted text-sm py-4 text-center">Нет участников</p>}
        </div>
      </div>

      {/* Rounds */}
      <div>
        <h2 className="heading-label mb-3">Раунды ({rounds.length})</h2>
        <div className="flex flex-col gap-1">
          {rounds.map((r: any) => (
            <div key={r.id} className="dark-panel p-3 flex items-center gap-3 text-sm">
              <span className="mono-stat text-xs text-text-muted w-8">R{r.round_number}</span>
              <span className="w-32 truncate text-text-body">
                {participants.find((p: any) => p.id === r.participant_id)?.name || r.participant_id}
              </span>
              <span className="mono-stat font-bold text-text-primary w-12">{r.points_earned} pts</span>

              {editRound === r.id ? (
                <div className="flex-1 flex flex-wrap items-center gap-2">
                  <input type="number" value={editRoundForm.points_earned ?? r.points_earned} onChange={e => setEditRoundForm({...editRoundForm, points_earned: +e.target.value})} className="w-16 bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm" />
                  <input value={editRoundForm.map_name || r.map_name || ''} onChange={e => setEditRoundForm({...editRoundForm, map_name: e.target.value})} className="bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm w-32" placeholder="Карта" />
                  <input type="number" value={editRoundForm.deaths ?? r.deaths ?? 0} onChange={e => setEditRoundForm({...editRoundForm, deaths: +e.target.value})} className="w-12 bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm" placeholder="Смерти" />
                  <button onClick={() => handleSaveRound(r.id)} disabled={saving} className="btn-ghost text-xs px-2">✓</button>
                  <button onClick={() => setEditRound(null)} className="btn-ghost text-xs px-2">✕</button>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-3 text-xs text-text-muted">
                  {r.map_name && <span>🗺 {r.map_name}</span>}
                  {r.deaths > 0 && <span>💀 {r.deaths}</span>}
                  <button onClick={() => { setEditRound(r.id); setEditRoundForm(r); }} className="btn-ghost text-xs px-2 ml-auto">✎</button>
                </div>
              )}
            </div>
          ))}
          {rounds.length === 0 && <p className="text-text-muted text-sm py-4 text-center">Нет раундов</p>}
        </div>
      </div>
    </div>
  );
}
