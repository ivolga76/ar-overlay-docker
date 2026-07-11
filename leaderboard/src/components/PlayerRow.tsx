import Link from 'next/link';
import { motion } from 'framer-motion';
import type { StandingEntry } from '@/lib/types';
import { formatMmr } from '@/lib/utils';

interface PlayerRowProps {
  entry: StandingEntry;
  index: number;
}

export function PlayerRow({ entry, index }: PlayerRowProps) {
  const rank = index + 1;
  const isTop3 = rank <= 3;
  const mmr = formatMmr(entry.mmr);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.015, 0.18) }}
      className={`lb-row ${isTop3 ? `lb-row-top lb-row-top-${rank}` : ''}`}
    >
      <div className="lb-rank">
        <span>{rank.toString().padStart(2, '0')}</span>
      </div>

      <div className="lb-player-cell">
        <Link href={`/player/${entry.participantId}`} className="lb-player-name">
          {entry.nickname}
        </Link>
        <span>
          {entry.isTeam ? 'Команда' : 'Игрок'} · {entry.tournamentName}
          {entry.organizerName ? ` · ${entry.organizerName}` : ''}
        </span>
      </div>

      <div className="lb-mmr">
        <strong className={mmr.colorClass}>{mmr.value}</strong>
        <span>rating</span>
      </div>

      <div className="lb-record">
        <strong>{entry.wins}</strong>
        <span>/</span>
        <strong>{entry.losses}</strong>
      </div>

      <div className="lb-points">
        <strong>{entry.totalPoints}</strong>
        <span>pts</span>
      </div>
    </motion.article>
  );
}
