'use client';
// RatingRow — animated row for season 1×1 / 2×2 rating tables
// Medal animations for top 3, spring entrance

import { motion } from 'framer-motion';
import type { SeasonRating } from '@/lib/types';

interface RatingRowProps {
  entry: SeasonRating;
  index: number;
}

const medals = ['🥇', '🥈', '🥉'];
const rankGlowClasses = ['crt-glow-gold', 'text-text-primary', 'crt-glow-cyan'];

export function RatingRow({ entry, index }: RatingRowProps) {
  const isTop3 = index < 3;

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
      className="border-b border-[rgba(234,224,205,0.03)] hover:bg-[rgba(0,255,255,0.03)] transition-colors"
    >
      {/* Rank */}
      <td className="py-3 px-4">
        {isTop3 ? (
          <motion.span
            className="inline-block text-lg"
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.05 + index * 0.03 }}
          >
            {medals[index]}
          </motion.span>
        ) : (
          <span className={`font-heading font-bold text-sm ${index < 5 ? 'text-text-primary' : 'text-text-muted'}`}>
            {entry.rank}
          </span>
        )}
      </td>

      {/* Name */}
      <td className="py-3 px-4 font-heading font-bold text-text-primary">
        {entry.participant_name}
      </td>

      {/* MMR */}
      <td className="py-3 px-4 text-right mono-stat text-accent-magenta font-bold">
        {entry.mmr}
      </td>

      {/* Points */}
      <td className="py-3 px-4 text-right mono-stat text-text-primary">
        {entry.total_points}
      </td>

      {/* Wins */}
      <td className="py-3 px-4 text-right mono-stat text-accent-green font-semibold">
        {entry.wins}
      </td>

      {/* Losses */}
      <td className="py-3 px-4 text-right mono-stat text-accent-red font-semibold">
        {entry.losses}
      </td>

      {/* Tournaments played */}
      <td className="py-3 px-4 text-right mono-stat text-text-muted">
        {entry.tournaments_played}
      </td>

      {/* Best score */}
      <td className="py-3 px-4 text-right mono-stat text-accent-gold font-semibold">
        {entry.best_score}
      </td>
    </motion.tr>
  );
}
