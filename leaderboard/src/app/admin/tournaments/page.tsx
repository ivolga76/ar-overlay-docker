'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getTournaments, getSeasons } from '@/lib/api';

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeason, setFilterSeason] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMode, setFilterMode] = useState('');

  useEffect(() => { getSeasons().then(setSeasons); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSeason) params.set('season_id', filterSeason);
      const qs = params.toString();
      const data = await getTournaments(filterSeason || undefined);
      setTournaments(data);
    } catch { setTournaments([]); }
    setLoading(false);
  }, [filterSeason]);

  useEffect(() => { load(); }, [load]);

  const filtered = tournaments.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterMode && t.mode !== filterMode) return false;
    return true;
  });

  const statusLabel: Record<string, string> = { draft: 'Черновик', active: 'Активен', completed: 'Завершён' };
  const statusColor: Record<string, string> = {
    draft: 'bg-[rgba(255,255,255,0.05)] text-text-muted',
    active: 'chip-cyan',
    completed: 'chip-primary',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading-section">Турниры</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select value={filterSeason} onChange={e => setFilterSeason(e.target.value)} className="bg-bg-secondary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1.5 text-sm">
          <option value="">Все сезоны</option>
          {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-bg-secondary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1.5 text-sm">
          <option value="">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="active">Активен</option>
          <option value="completed">Завершён</option>
        </select>
        <select value={filterMode} onChange={e => setFilterMode(e.target.value)} className="bg-bg-secondary border border-[rgba(96,128,255,0.2)] rounded px-2 py-1.5 text-sm">
          <option value="">Все режимы</option>
          <option value="1x1">1×1</option>
          <option value="2x2">2×2</option>
        </select>
        <span className="text-xs text-text-muted">{filtered.length} турниров</span>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton w-full h-14" />)}</div>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map(t => (
            <Link key={t.id} href={`/admin/tournaments/${t.id}`} className="no-underline">
              <div className="dark-panel dark-panel-hover p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-heading font-bold text-text-primary">{t.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {t.mode === '1x1' ? '1×1' : '2×2'}
                    {t.organizer_name ? ` · ${t.organizer_name}` : ''}
                    {t.completed_at ? ` · ${new Date(t.completed_at).toLocaleDateString('ru-RU')}` : ''}
                  </p>
                </div>
                <span className={`chip text-[10px] ${statusColor[t.status] || ''}`}>
                  {statusLabel[t.status] || t.status}
                  {t.status === 'active' && <span className="live-dot ml-1 inline-block" style={{width:5,height:5}} />}
                </span>
                <span className="text-text-muted text-xs">→</span>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && <p className="text-text-muted text-sm py-10 text-center">Нет турниров</p>}
        </div>
      )}
    </div>
  );
}
