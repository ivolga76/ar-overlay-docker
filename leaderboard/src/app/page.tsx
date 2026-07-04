// Home page — ARC Raiders tournament standings hub
// Design v2: cybershoke.net palette × ARC Raiders identity

import Link from 'next/link';
import { RainbowStripe } from '@/components/RainbowStripe';
import { FeatureCard } from '@/components/FeatureCard';
import { ScrollReveal, ScrollRevealItem } from '@/components/ScrollReveal';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { getTournaments, getSeasons } from '@/lib/api';

export const revalidate = 60;

export default async function HomePage() {
  const [tournaments, seasons] = await Promise.all([
    getTournaments(),
    getSeasons('active'),
  ]);
  const completed = tournaments.filter((t) => t.status === 'completed');
  const activeCount = tournaments.filter((t) => t.status === 'active').length;
  const activeSeasons = seasons;

  return (
    <main className="flex-1">
      {/* ════════════ Hero ════════════ */}
      <section className="max-w-4xl mx-auto px-4 pt-12 pb-16 relative">
        <div className="relative overflow-hidden rounded-2xl bg-bg-secondary border border-[rgba(96,128,255,0.12)]">
          {/* Background gradient */}
          <div className="absolute inset-0 animated-neon-bg" />
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-animated-grid" />

          <div className="relative z-10 px-8 py-20 text-center">
            {/* Eyebrow */}
            <p className="eyebrow mb-4 typewriter-cursor">
              СООБЩЕСТВО · ТУРНИРЫ · РЕЙТИНГ
            </p>

            {/* Title */}
            <h1 className="heading-xl leading-none mb-2">
              <span
                className="block text-5xl md:text-6xl glitch-text"
                data-text="ARC RAIDERS"
              >
                ARC RAIDERS
              </span>
              <span className="block text-2xl md:text-3xl mt-1 opacity-90 text-neon-flicker">
                OVERLAY
              </span>
            </h1>

            {/* Tagline */}
            <blockquote className="tagline inline-block mx-auto mt-6 mb-8">
              enlist. compete. rise
            </blockquote>

            <p className="text-text-body text-base max-w-lg mx-auto mb-10 leading-relaxed">
              Турнирная таблица сообщества. Следи за рейтингом игроков и команд
              в мире Arc Raiders. Каждый турнир — шаг к вершине.
            </p>

            {/* CTA */}
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/standings" className="fx-btn-perspective inline-flex items-center gap-2">
                Глобальный рейтинг
                <span className="text-lg">→</span>
              </Link>
              {activeSeasons.length > 0 && (
                <Link
                  href={`/season/${activeSeasons[0].id}`}
                  className="btn-secondary"
                >
                  Сезон {activeSeasons[0].name}
                </Link>
              )}
            </div>

            {/* Stats bar */}
            {(completed.length > 0 || activeCount > 0) && (
              <div className="flex flex-wrap justify-center gap-6 mt-10 pt-8 border-t border-[rgba(96,128,255,0.1)]">
                <div className="stat-card">
                  <AnimatedCounter
                    target={completed.length}
                    className="stat-value text-accent-primary"
                  />
                  <p className="stat-label">завершено</p>
                </div>
                {activeCount > 0 && (
                  <div className="stat-card">
                    <span className="stat-value text-accent-green inline-flex items-center gap-2">
                      <span className="live-dot" />
                      <AnimatedCounter target={activeCount} duration={800} />
                    </span>
                    <p className="stat-label">в эфире</p>
                  </div>
                )}
                <div className="stat-card">
                  <AnimatedCounter
                    target={completed.reduce((sum, t) => sum + (t.total_rounds || 0), 0)}
                    className="stat-value text-accent-gold"
                    duration={2000}
                  />
                  <p className="stat-label">раундов сыграно</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ════════════ Features ════════════ */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <hr className="neon-divider flex-1" />
          <h2 className="heading-section flex-shrink-0">Возможности</h2>
          <hr className="neon-divider flex-1" />
        </div>

        <ScrollReveal direction="up" staggerDelay={100}>
          <div className="feature-grid">
            <ScrollRevealItem>
              <FeatureCard
                icon=""
                title="Рейтинг игроков"
                description="MMR-система: очки × победы × поражения. Глобальный топ и таблицы турниров."
              />
            </ScrollRevealItem>
            <ScrollRevealItem>
              <FeatureCard
                icon=""
                title="1×1 и 2×2"
                description="Соло-дуэли и командные битвы. Переключайтесь между режимами в один клик."
              />
            </ScrollRevealItem>
            <ScrollRevealItem>
              <FeatureCard
                icon=""
                title="Live-обновления"
                description="Турнирная таблица обновляется автоматически. Следите за результатами в реальном времени."
              />
            </ScrollRevealItem>
            <ScrollRevealItem>
              <FeatureCard
                icon=""
                title="Дизайн ARC Raiders"
                description="Sci-fi эстетика мира Speranza. Неон, CRT-свечение, тёмная палитра."
              />
            </ScrollRevealItem>
          </div>
        </ScrollReveal>
      </section>

      {/* ════════════ Seasons ════════════ */}
      {activeSeasons.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 pb-16">
          <div className="flex items-center gap-3 mb-8">
            <hr className="neon-divider flex-1" />
            <h2 className="heading-section flex-shrink-0">Сезоны</h2>
            <hr className="neon-divider flex-1" />
          </div>
          <nav className="fx-misc-breadcrumb">
            {activeSeasons.map((s) => (
              <Link key={s.id} href={`/season/${s.id}`}>
                {s.name}
              </Link>
            ))}
          </nav>
        </section>
      )}

      {/* ════════════ Tournament Cards ════════════ */}
      {completed.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 pb-20">
          <div className="flex items-center gap-3 mb-6">
            <hr className="neon-divider flex-1" />
            <h2 className="heading-section flex-shrink-0">Завершённые турниры</h2>
            <hr className="neon-divider flex-1" />
          </div>

          <ScrollReveal direction="left" staggerDelay={80}>
            <div className="scroll-carousel">
              {completed.map((t) => (
                <ScrollRevealItem key={t.id}>
                  <Link href={`/standings/${t.id}`} className="no-underline">
                    <div className="tournament-card scan-line">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="chip chip-primary">
                          {t.mode === '1x1' ? '1×1' : '2×2'}
                        </span>
                      </div>
                      <h3 className="heading-label text-base leading-tight mb-1 line-clamp-2">
                        {t.name}
                      </h3>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-text-muted font-heading uppercase tracking-wider">
                          {t.completed_at
                            ? new Date(t.completed_at).toLocaleDateString('ru-RU')
                            : 'В процессе'}
                        </span>
                        <span className="text-accent-primary text-sm font-heading font-bold uppercase tracking-wider">
                          Таблица →
                        </span>
                      </div>
                    </div>
                  </Link>
                </ScrollRevealItem>
              ))}
            </div>
          </ScrollReveal>
        </section>
      )}
    </main>
  );
}
