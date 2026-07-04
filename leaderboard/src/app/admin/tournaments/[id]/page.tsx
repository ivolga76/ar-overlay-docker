'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getTournament, updateParticipant, updateRound } from '@/lib/api';
import { createComplication, updateComplication, deleteComplication } from '@/lib/api';
import { createBonusTask, updateBonusTask, deleteBonusTask } from '@/lib/api';
import { getAdminToken } from '@/lib/admin-helpers';

function getToken() { return getAdminToken(); }

export default function AdminTournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editPart, setEditPart] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editRound, setEditRound] = useState<string | null>(null);
  const [editRoundForm, setEditRoundForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Complications state
  const [newComp, setNewComp] = useState('');
  const [editComp, setEditComp] = useState<string | null>(null);
  const [editCompText, setEditCompText] = useState('');
  // Bonus tasks state
  const [newBt, setNewBt] = useState('');
  const [newBtPoints, setNewBtPoints] = useState(2);
  const [editBt, setEditBt] = useState<string | null>(null);
  const [editBtFields, setEditBtFields] = useState<any>({});

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

  // ── Complication handlers ──

  async function handleAddComp() {
    if (!newComp.trim()) return;
    setSaving(true);
    try {
      await createComplication(id as string, newComp, getToken());
      setNewComp('');
      load();
    } catch (err: any) { alert(err.message); }
    setSaving(false);
  }

  async function handleSaveComp(cid: string) {
    if (!editCompText.trim()) return;
    setSaving(true);
    try {
      await updateComplication(cid, editCompText, getToken());
      setEditComp(null);
      load();
    } catch (err: any) { alert(err.message); }
    setSaving(false);
  }

  async function handleDeleteComp(cid: string) {
    if (!confirm('Удалить?')) return;
    setSaving(true);
    try {
      await deleteComplication(cid, getToken());
      load();
    } catch (err: any) { alert(err.message); }
    setSaving(false);
  }

  // ── Bonus task handlers ──

  async function handleAddBt() {
    if (!newBt.trim()) return;
    setSaving(true);
    try {
      await createBonusTask(id as string, newBt, newBtPoints, getToken());
      setNewBt('');
      setNewBtPoints(2);
      load();
    } catch (err: any) { alert(err.message); }
    setSaving(false);
  }

  async function handleSaveBt(bid: string) {
    setSaving(true);
    try {
      await updateBonusTask(bid, editBtFields, getToken());
      setEditBt(null);
      load();
    } catch (err: any) { alert(err.message); }
    setSaving(false);
  }

  async function handleDeleteBt(bid: string) {
    if (!confirm('Удалить?')) return;
    setSaving(true);
    try {
      await deleteBonusTask(bid, getToken());
      load();
    } catch (err: any) { alert(err.message); }
    setSaving(false);
  }

  if (loading) return <div className="py-10"><div className="skeleton w-60 h-6 mb-4" /><div className="skeleton w-full h-60" /></div>;
  if (!data) return <p className="text-text-muted py-10">Турнир не найден</p>;

  const { tournament, participants = [], rounds = [], standings = [], complications = [], bonusTasks = [] } = data;

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
                    {p.embark_id && <span>Embark: {p.embark_id}</span>}
                    {p.discord_role && <span>Discord: {p.discord_role}</span>}
                    {p.amplifier && <span>Amp: {p.amplifier}</span>}
                    {p.shield && <span>Shield: {p.shield}</span>}
                    <button onClick={() => { setEditPart(p.id); setEditForm(p); }} className="btn-ghost text-xs px-2 ml-auto">✎ Редактировать</button>
                  </div>
                )}
              </div>
            );
          })}
          {participants.length === 0 && <p className="text-text-muted text-sm py-4 text-center">Нет участников</p>}
        </div>
      </div>

      {/* Complications */}
      <div className="mb-8">
        <h2 className="heading-label mb-3">Усложнения ({complications.length})</h2>
        <div className="flex flex-col gap-1">
          {complications.map((c: any) => (
            <div key={c.id} className="dark-panel p-3 flex items-center gap-3 text-sm">
              {editComp === c.id ? (
                <>
                  <input value={editCompText} onChange={e => setEditCompText(e.target.value)} className="flex-1 bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm" placeholder="Текст усложнения" />
                  <button onClick={() => handleSaveComp(c.id)} disabled={saving} className="btn-ghost text-xs px-2">✓</button>
                  <button onClick={() => setEditComp(null)} className="btn-ghost text-xs px-2">✕</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-text-primary">{c.text}</span>
                  <button onClick={() => { setEditComp(c.id); setEditCompText(c.text); }} className="btn-ghost text-xs px-2">✎</button>
                  <button onClick={() => handleDeleteComp(c.id)} className="btn-ghost text-xs px-2 text-red-400">×</button>
                </>
              )}
            </div>
          ))}
          {/* Add new */}
          <div className="dark-panel p-3 flex items-center gap-2 text-sm">
            <input value={newComp} onChange={e => setNewComp(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComp()} className="flex-1 bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm" placeholder="Новое усложнение..." />
            <button onClick={handleAddComp} disabled={saving || !newComp.trim()} className="btn-ghost text-xs px-3">+ Добавить</button>
          </div>
        </div>
      </div>

      {/* Bonus Tasks */}
      <div className="mb-8">
        <h2 className="heading-label mb-3">Бонусные задания ({bonusTasks.length})</h2>
        <div className="flex flex-col gap-1">
          {bonusTasks.map((bt: any) => (
            <div key={bt.id} className="dark-panel p-3 flex items-center gap-3 text-sm">
              {editBt === bt.id ? (
                <>
                  <input value={editBtFields.text || bt.text} onChange={e => setEditBtFields({...editBtFields, text: e.target.value})} className="flex-1 bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm" placeholder="Текст задания" />
                  <input type="number" value={editBtFields.points ?? bt.points} onChange={e => setEditBtFields({...editBtFields, points: +e.target.value})} className="w-16 bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm" />
                  <button onClick={() => handleSaveBt(bt.id)} disabled={saving} className="btn-ghost text-xs px-2">✓</button>
                  <button onClick={() => setEditBt(null)} className="btn-ghost text-xs px-2">✕</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-text-primary">{bt.text}</span>
                  <span className="mono-stat text-xs text-accent-primary w-12">{bt.points} pts</span>
                  <button onClick={() => { setEditBt(bt.id); setEditBtFields({ text: bt.text, points: bt.points }); }} className="btn-ghost text-xs px-2">✎</button>
                  <button onClick={() => handleDeleteBt(bt.id)} className="btn-ghost text-xs px-2 text-red-400">×</button>
                </>
              )}
            </div>
          ))}
          {/* Add new */}
          <div className="dark-panel p-3 flex items-center gap-2 text-sm">
            <input value={newBt} onChange={e => setNewBt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddBt()} className="flex-1 bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm" placeholder="Новое бонусное задание..." />
            <input type="number" value={newBtPoints} onChange={e => setNewBtPoints(+e.target.value)} className="w-16 bg-bg-primary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1 text-sm" min={1} />
            <button onClick={handleAddBt} disabled={saving || !newBt.trim()} className="btn-ghost text-xs px-3">+ Добавить</button>
          </div>
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
                  {r.map_name && <span>Map: {r.map_name}</span>}
                  {r.deaths > 0 && <span>Deaths: {r.deaths}</span>}
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
