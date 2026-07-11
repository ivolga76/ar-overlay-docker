'use client';
// RatingsTable — animated rating table using RatingRow
// V2: matches the new dark/cream/cyan design

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
      <div className="bg-[rgba(12,13,17,0.86)] border border-[rgba(234,224,205,0.12)] rounded-lg shadow-[0_20px_70px_rgba(0,0,0,0.32)] text-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-[#8b867b]">{emptyMessage}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[rgba(234,224,205,0.12)] bg-[rgba(12,13,17,0.86)] shadow-[0_20px_70px_rgba(0,0,0,0.32)]">
      {/* Rainbow progress bar for visual flair */}
      <div className="h-[3px] bg-[linear-gradient(90deg,#0080ff_0_24%,#00cc44_24%_48%,#e83030_48%_72%,#ffcc00_72%_100%)] bg-[length:200%_100%] animate-[progress-slide_2s_linear_infinite]" />

      <table className="w-full text-sm">
        <thead>
          <tr className="text-[#8b867b] text-[10px] uppercase tracking-wider border-b border-[rgba(234,224,205,0.06)]">
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
