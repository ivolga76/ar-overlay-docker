'use client';
// RatingRow — animated row for season 1×1 / 2×2 rating tables
// V2: clean rank numbers (no emoji), matches PlayerRow design

import { motion } from 'framer-motion';
import type { SeasonRating } from '@/lib/types';

interface RatingRowProps {
  entry: SeasonRating;
  index: number;
}

const rankAccent = ['text-[#ffb800] [text-shadow:0_0_8px_rgba(255,184,0,0.4)]', 'text-[#c0c0c0]', 'text-[#cd7f32]'];

export function RatingRow({ entry, index }: RatingRowProps) {
  const rank = index + 1;
  const isTop3 = rank <= 3;
  const mmrColor = entry.mmr > 1000 ? 'text-[#00e5ff]' : entry.mmr < 1000 ? 'text-[#ef4444]' : 'text-[#8b867b]';

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        delay: index * 0.04,
      }}
      className="border-b border-[rgba(234,224,205,0.04)] hover:bg-[rgba(0,229,255,0.03)] transition-colors"
    >
      {/* Rank */}
      <td className="py-3 px-4">
        <span className={`inline-grid place-items-center w-8 h-8 rounded-md bg-[rgba(0,0,0,0.28)] border border-[rgba(234,224,205,0.1)] font-mono font-bold text-sm ${isTop3 ? rankAccent[rank - 1] : rank <= 5 ? 'text-[#eae0cd]' : 'text-[#8b867b]'}`}>
          {rank.toString().padStart(2, '0')}
        </span>
      </td>

      {/* Name */}
      <td className="py-3 px-4 font-heading font-extrabold text-[#eae0cd] uppercase">
        {entry.participant_name}
      </td>

      {/* MMR */}
      <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${mmrColor}`}>
        {entry.mmr}
      </td>

      {/* Points */}
      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#eae0cd]">
        {entry.total_points}
      </td>

      {/* Wins */}
      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-[#22c55e]">
        {entry.wins}
      </td>

      {/* Losses */}
      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-[#ef4444]">
        {entry.losses}
      </td>

      {/* Tournaments played */}
      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#8b867b]">
        {entry.tournaments_played}
      </td>

      {/* Best score */}
      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-[#ffb800]">
        {entry.best_score}
      </td>
    </motion.tr>
  );
}
