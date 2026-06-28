'use client';
// RatingsTable — animated rating table using RatingRow
// Client wrapper for season 1×1 / 2×2 pages

import { motion, AnimatePresence } from 'framer-motion';
import type { SeasonRating } from '@/lib/types';
import { RatingRow } from './RatingRow';

interface RatingsTableProps {
  ratings: SeasonRating[];
  emptyMessage?: string;
}

export function RatingsTable({ ratings, emptyMessage = 'Нет данных для отображения.' }: RatingsTableProps) {
  if (ratings.length === 0) {
    return (
      <div className="dark-panel text-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-text-muted">{emptyMessage}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Progress bar for visual flair */}
      <div className="mb-1">
        <div className="progress-rainbow" />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-text-muted text-[10px] uppercase tracking-wider border-b border-[rgba(234,224,205,0.06)]">
            <th className="text-left py-3 px-4">#</th>
            <th className="text-left py-3 px-4">Игрок</th>
            <th className="text-right py-3 px-4">MMR</th>
            <th className="text-right py-3 px-4">Очки</th>
            <th className="text-right py-3 px-4">W</th>
            <th className="text-right py-3 px-4">L</th>
            <th className="text-right py-3 px-4">Турниров</th>
            <th className="text-right py-3 px-4">Лучший</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {ratings.map((r, i) => (
              <RatingRow key={r.participant_name} entry={r} index={i} />
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
