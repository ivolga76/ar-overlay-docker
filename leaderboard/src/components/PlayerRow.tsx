// PlayerRow — single row in the standings table
// Enhanced: rank-specific glow, medal animations, 3D hover lift
// Clickable → opens player stats page

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { StandingEntry } from '@/lib/types';
import { formatMmr } from '@/lib/utils';

interface PlayerRowProps {
  entry: StandingEntry;
  index: number;
}

const medals = ['🥇', '🥈', '🥉'];
const topRowClasses = ['top-row-gold', 'top-row-silver', 'top-row-bronze'];
const medalAnimations = ['rank-badge-1', 'rank-badge-2', 'rank-badge-3'];

export function PlayerRow({ entry, index }: PlayerRowProps) {
  const isTop3 = index < 3;
  const mmr = formatMmr(entry.mmr);
  const topClass = isTop3 ? topRowClasses[index] : '';
  const medalClass = isTop3 ? medalAnimations[index] : '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 35,
        mass: 1,
        delay: index * 0.03,
      }}
      className={`
        dark-panel card-tilt
        flex items-center gap-3 px-4 py-3
        cursor-pointer
        ${topClass}
      `}
      whileHover={
        isTop3
          ? { scale: 1.02, y: -2 }
          : { scale: 1.01, y: -1 }
      }
    >
      {/* Rank — animated medal drop for top 3 */}
      <motion.div layout className="w-10 text-center flex-shrink-0">
        {isTop3 ? (
          <motion.span
            className={`inline-block text-xl ${medalClass}`}
            initial={{ scale: 2, opacity: 0, y: -30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 20,
              delay: 0.1 + index * 0.05,
            }}
          >
            {medals[index]}
          </motion.span>
        ) : (
          <motion.span
            layout
            className="mono-stat text-sm text-text-muted"
          >
            #{entry.rank}
          </motion.span>
        )}
      </motion.div>

      {/* Nickname — clickable link to player page */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/player/${entry.participantId}`}
            className={`
              heading-lg text-base truncate
              hover:text-accent-cyan transition-colors
              ${isTop3 ? 'crt-glow-gold' : 'text-text-primary'}
            `}
          >
            {entry.nickname}
          </Link>
          {entry.isTeam && (
            <span className="text-[10px] uppercase tracking-wider text-accent-cyan font-heading font-bold">
              team
            </span>
          )}
        </div>
        <div className="text-xs text-text-muted mt-0.5 truncate">
          {entry.tournamentName}
          {entry.organizerName && <span> · {entry.organizerName}</span>}
        </div>
      </div>

      {/* MMR — animated number with glow */}
      <motion.div layout className="w-16 text-right flex-shrink-0">
        <motion.span
          className={`mono-stat text-lg font-bold ${mmr.colorClass}`}
          key={entry.mmr}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 25 }}
        >
          {mmr.value}
        </motion.span>
      </motion.div>

      {/* Wins / Losses */}
      <motion.div
        layout
        className="w-20 text-right flex-shrink-0 hidden sm:block"
      >
        <span className="mono-stat text-sm text-success font-semibold">{entry.wins}W</span>
        <span className="mono-stat text-sm text-text-muted mx-1">/</span>
        <span className="mono-stat text-sm text-danger font-semibold">{entry.losses}L</span>
      </motion.div>

      {/* Chevron + scan line effect on top 3 */}
      <div className={`
        w-6 text-right flex-shrink-0 transition-colors duration-300
        ${isTop3 ? 'text-accent-gold opacity-80' : 'text-text-muted opacity-40'}
      `}>
        ›
      </div>
    </motion.div>
  );
}
