'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { StandingEntry } from '@/lib/types';
import { PlayerRow } from './PlayerRow';
import { SeasonTabs, type SeasonTab } from './SeasonTabs';

const MODE_TABS: SeasonTab[] = [
  { id: '1x1', label: '1x1' },
  { id: '2x2', label: '2x2' },
  { id: 'legends-1x1', label: 'Легенды 1x1' },
  { id: 'legends-2x2', label: 'Легенды 2x2' },
];

interface StandingsTableProps {
  title: string;
  subtitle?: string;
  entries: StandingEntry[];
  lastUpdated?: string;
  isLoading?: boolean;
  activeSeasonId?: string | null;
}

export function StandingsTable({
  title,
  subtitle,
  entries,
  lastUpdated,
  isLoading = false,
  activeSeasonId,
}: StandingsTableProps) {
  const [modeFilter, setModeFilter] = useState('1x1');

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (modeFilter === '1x1' || modeFilter === '2x2') {
        return e.mode === modeFilter && e.seasonId === activeSeasonId;
      }
      const legendMode = modeFilter === 'legends-1x1' ? '1x1' : '2x2';
      return e.mode === legendMode;
    });
  }, [entries, modeFilter, activeSeasonId]);

  return (
    <section className="lb-table-shell">
      <div className="lb-table-header">
        <div>
          <p className="eyebrow">Турнирная таблица</p>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <SeasonTabs tabs={MODE_TABS} active={modeFilter} onChange={setModeFilter} />
      </div>

      <div className="lb-table-columns" aria-hidden="true">
        <span>#</span>
        <span>Участник</span>
        <span>MMR</span>
        <span>W / L</span>
        <span>Очки</span>
      </div>

      <div className="lb-table-frame">
        {isLoading ? (
          <LoadingSkeleton count={8} />
        ) : filtered.length === 0 ? (
          <div className="lb-empty-state">
            <strong>Нет данных</strong>
            <span>Завершённые турниры появятся здесь после первых матчей.</span>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="lb-row-stack">
              {filtered.map((entry, i) => (
                <PlayerRow
                  key={`${entry.tournamentId}-${entry.participantId}-${entry.nickname}`}
                  entry={entry}
                  index={i}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {lastUpdated && (
        <p className="lb-updated">
          Последнее обновление: {lastUpdated}
        </p>
      )}
    </section>
  );
}

function LoadingSkeleton({ count }: { count: number }) {
  return (
    <div className="lb-row-stack">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="lb-row lb-row-skeleton" style={{ animationDelay: `${i * 0.06}s` }}>
          <div />
          <div />
          <div />
          <div />
          <div />
        </div>
      ))}
    </div>
  );
}
