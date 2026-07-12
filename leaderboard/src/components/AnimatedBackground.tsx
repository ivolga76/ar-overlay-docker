'use client';
// AnimatedBackground — Embark Studios style: большие размытые градиентные орбы,
// движущаяся сетка и плавающие частицы на тёмном фоне.
// Pure CSS для орбов + сетки, JS для генерации частиц.

import { useEffect, useRef } from 'react';

interface AnimatedBackgroundProps {
  /** Показывать движущуюся сетку */
  grid?: boolean;
  /** Количество плавающих частиц */
  particleCount?: number;
  /** Показывать градиентные орбы */
  orbs?: boolean;
  className?: string;
}

export function AnimatedBackground({
  grid = true,
  particleCount = 20,
  orbs = true,
  className = '',
}: AnimatedBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || particleCount === 0) return;

    const particles: HTMLDivElement[] = [];
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'bg-particle';
      particle.style.setProperty('--x', `${Math.random() * 100}%`);
      particle.style.setProperty('--y-start', `${Math.random() * 100}%`);
      particle.style.setProperty('--duration', `${8 + Math.random() * 16}s`);
      particle.style.setProperty('--delay', `${Math.random() * 10}s`);
      particle.style.setProperty('--size', `${1 + Math.random() * 2}px`);
      // Случайный цвет: cyan, gold, white
      const colors = [
        'var(--color-accent-cyan)',
        'var(--color-accent-gold)',
        'rgba(255,255,255,0.6)',
        'var(--color-accent-primary)',
      ];
      particle.style.setProperty(
        '--color',
        colors[Math.floor(Math.random() * colors.length)]
      );
      container.appendChild(particle);
      particles.push(particle);
    }

    return () => {
      particles.forEach((p) => p.remove());
    };
  }, [particleCount]);

  const orbClass = orbs ? 'bg-animated-orbs' : '';
  const gridClass = grid ? 'bg-animated-grid' : '';

  return (
    <div
      ref={containerRef}
      className={`embark-bg absolute inset-0 overflow-hidden pointer-events-none ${orbClass} ${gridClass} ${className}`}
      aria-hidden="true"
    />
  );
}
