'use client';
// ScrollReveal — элементы проявляются с анимацией при скролле
// Использует IntersectionObserver, классы из globals.css

import { useEffect, useRef, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Направление: снизу, слева, справа */
  direction?: 'up' | 'left' | 'right';
  /** Задержка в ms между дочерними элементами */
  staggerDelay?: number;
  /** Дополнительный класс при видимости */
  visibleClass?: string;
}

export function ScrollReveal({
  children,
  className = '',
  direction = 'up',
  staggerDelay = 0,
  visibleClass = '',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('scroll-revealed');
            // Stagger children
            const items = entry.target.querySelectorAll<HTMLElement>('.scroll-reveal-item');
            items.forEach((item, i) => {
              setTimeout(() => {
                item.classList.add('scroll-revealed-item');
                if (visibleClass) item.classList.add(visibleClass);
              }, i * staggerDelay);
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [staggerDelay, visibleClass]);

  const dirMap = {
    up: 'scroll-reveal-up',
    left: 'scroll-reveal-left',
    right: 'scroll-reveal-right',
  };

  return (
    <div ref={ref} className={`${dirMap[direction]} ${className}`}>
      {children}
    </div>
  );
}

/** Обёртка для одного дочернего элемента внутри ScrollReveal */
export function ScrollRevealItem({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`scroll-reveal-item ${className}`}>{children}</div>;
}
