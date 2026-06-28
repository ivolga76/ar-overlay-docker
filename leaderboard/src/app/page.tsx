// Home page — tournament standings hub
// Enhanced: glitch heading, animated counters, particle background, button effects

import Link from 'next/link';
import { RainbowStripe } from '@/components/RainbowStripe';
import { FeatureCard } from '@/components/FeatureCard';
import { ScrollReveal, ScrollRevealItem } from '@/components/ScrollReveal';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { getTournaments, getSeasons } from '@/lib/api';

export const dynamic = 'force-static';
export const revalidate = 3600;

export default async function HomePage() {
  const [tournaments, seasons] = await Promise.all([
    getTournaments(),
    getSeasons(),
  ]);
  const completed = tournaments.filter((t) => t.status === 'completed');
  const activeCount = tournaments.filter((t) => t.status === 'active').length;
  const activeSeasons = seasons.filter((s) => s.status === 'active');

  return (
    <main className="flex-1">
      {/* ════════════ Hero — animated background + glitch heading ════════════ */}
      <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 relative">
        <AnimatedBackground grid particleCount={20} />

        <RainbowStripe className="rounded-lg overflow-hidden relative z-10">
          <div className="px-8 py-20 text-center relative">
            {/* Eyebrow with typewriter cursor */}
            <p className="eyebrow mb-4 tracking-[0.15em] typewriter-cursor">
              СООБЩЕСТВО • ТУРНИРЫ • РЕЙТИНГ
            </p>

            {/* Main title — glitch text + CRT glow */}
            <h1 className="heading-xl leading-none mb-2 crt-glow">
              <span
                className="block text-5xl md:text-6xl glitch-text"
                data-text="ARC RAIDERS"
              >
                ARC RAIDERS
              </span>
              <span className="block text-2xl md:text-3xl mt-1 opacity-80 text-neon-flicker">
                OVERLAY
              </span>
            </h1>

            {/* Tagline */}
            <blockquote className="tagline inline-block mx-auto mt-6 mb-8 text-text-primary">
              enlist. compete. rise
            </blockquote>

            <p className="text-text-muted text-base max-w-lg mx-auto mb-10">
              Турнирная таблица сообщества. Следи за рейтингом игроков и команд
              в мире Arc Raiders. Каждый турнир — шаг к вершине.
            </p>

            {/* CTA — glow pulse button */}
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/standings"
                className="btn-glow-pulse btn-ripple inline-flex items-center gap-2 px-8 py-3.5 rounded-lg
                  bg-accent-cyan text-bg-primary font-heading font-bold uppercase text-sm tracking-wider
                  transition-all duration-300"
              >
                Глобальный рейтинг
                <span className="text-lg">→</span>
              </Link>
            </div>

            {/* Stats bar — animated counters */}
            {(completed.length > 0 || activeCount > 0) && (
              <div className="flex flex-wrap justify-center gap-6 mt-10 pt-8 border-t border-[rgba(234,224,205,0.06)]">
                <div className="text-center">
                  <AnimatedCounter
                    target={completed.length}
                    className="mono-stat text-2xl text-accent-cyan font-bold"
                  />
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">завершено</p>
                </div>
                {activeCount > 0 && (
                  <div className="text-center">
                    <span className="inline-flex items-center gap-1.5 mono-stat text-2xl text-accent-gold font-bold">
                      <span className="live-dot" />
                      <AnimatedCounter target={activeCount} duration={800} />
                    </span>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">в эфире</p>
                  </div>
                )}
                <div className="text-center">
                  <AnimatedCounter
                    target={completed.reduce((sum, t) => sum + (t.total_rounds || 0), 0)}
                    className="mono-stat text-2xl text-accent-magenta font-bold"
                    duration={2000}
                  />
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">раундов сыграно</p>
                </div>
              </div>
            )}
          </div>
        </RainbowStripe>
      </section>

      {/* ════════════ Features — scroll reveal ════════════ */}
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
                icon="🏆"
                title="Рейтинг игроков"
                description="MMR-система: очки × победы × поражения. Глобальный топ и таблицы турниров."
              />
            </ScrollRevealItem>
            <ScrollRevealItem>
              <FeatureCard
                icon="⚔️"
                title="Режимы 1×1 и 2×2"
                description="Соло-дуэли и командные битвы. Переключайтесь между режимами в один клик."
              />
            </ScrollRevealItem>
            <ScrollRevealItem>
              <FeatureCard
                icon="📡"
                title="Live-обновления"
                description="Турнирная таблица обновляется автоматически. Следите за результатами в реальном времени."
              />
            </ScrollRevealItem>
            <ScrollRevealItem>
              <FeatureCard
                icon="🎨"
                title="Дизайн ARC Raiders"
                description="Synthwave эстетика, CRT-свечение, неоновая палитра — стиль мира Speranza."
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
          <ScrollReveal direction="up" staggerDelay={120}>
            <div className="feature-grid">
              {activeSeasons.map((s) => (
                <ScrollRevealItem key={s.id}>
                  <Link href={`/season/${s.id}`}>
                    <FeatureCard
                      icon={s.id === 'season-2' ? '🆕' : '📅'}
                      title={s.name}
                      description={s.description || 'Турнирный сезон'}
                    />
                  </Link>
                </ScrollRevealItem>
              ))}
            </div>
          </ScrollReveal>
        </section>
      )}

      {/* ════════════ Tournament Cards — scroll reveal ════════════ */}
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
                  <Link href={`/standings/${t.id}`}>
                    <div className="dark-panel card-tilt card-glow-spread p-5 h-full flex flex-col justify-between min-h-[140px] scan-line">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(0,255,255,0.1)] text-accent-cyan font-heading font-bold">
                            {t.mode === '1x1' ? '1×1' : '2×2'}
                          </span>
                        </div>
                        <h3 className="heading-lg text-base leading-tight mb-1 line-clamp-2">
                          {t.name}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-text-muted">
                          {t.completed_at
                            ? new Date(t.completed_at).toLocaleDateString('ru-RU')
                            : 'В процессе'}
                        </span>
                        <span className="text-accent-cyan text-sm font-heading font-bold uppercase tracking-wider">
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

      {/* ════════════ Footer ════════════ */}
      <footer className="border-t border-[rgba(234,224,205,0.06)]">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-5">
              <a
                href="https://discord.gg/arcraiders"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs uppercase tracking-wider text-text-muted hover:text-accent-cyan transition-colors font-heading font-bold"
              >
                Discord
              </a>
              <a
                href="https://youtube.com/@ArcRaiders"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs uppercase tracking-wider text-text-muted hover:text-accent-cyan transition-colors font-heading font-bold"
              >
                YouTube
              </a>
              <a
                href="https://twitch.tv/denisblim"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs uppercase tracking-wider text-text-muted hover:text-accent-magenta transition-colors font-heading font-bold"
              >
                Twitch
              </a>
            </div>
            <span className="text-xs text-text-muted">
              AR Overlay · Битва за Респект
            </span>
          </div>

          <div className="border-t border-[rgba(234,224,205,0.04)] pt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-text-muted">
              ARC Raiders © 2026 Embark Studios AB. Неофициальный инструмент сообщества.
            </p>
            <a
              href="https://github.com/ivolga76/AR_Overlay"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-accent-cyan hover:text-text-primary transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
