'use client';
// AnimatedBackground — движущаяся сетка и частицы за Hero-секцией
// Pure CSS + небольшой JS для генерации частиц

import { useEffect, useRef } from 'react';

interface AnimatedBackgroundProps {
  /** Показывать движущуюся сетку */
  grid?: boolean;
  /** Количество плавающих частиц */
  particleCount?: number;
  className?: string;
}

export function AnimatedBackground({
  grid = true,
  particleCount = 15,
  className = '',
}: AnimatedBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || particleCount === 0) return;

    const particles: HTMLDivElement[] = [];
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.setProperty('--x', `${Math.random() * 100}%`);
      particle.style.setProperty('--duration', `${4 + Math.random() * 8}s`);
      particle.style.setProperty('--delay', `${Math.random() * 5}s`);
      // Случайный цвет: cyan или magenta
      particle.style.background =
        Math.random() > 0.5
          ? 'var(--color-accent-cyan)'
          : 'var(--color-accent-magenta)';
      container.appendChild(particle);
      particles.push(particle);
    }

    return () => {
      particles.forEach((p) => p.remove());
    };
  }, [particleCount]);

  const gridClass = grid ? 'bg-animated-grid' : '';

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${gridClass} ${className}`}
      aria-hidden="true"
    />
  );
}
