import Link from 'next/link';
import { getTournaments, getSeasons } from '@/lib/api';

export const revalidate = 60;

export default async function HomePage() {
  const [tournaments, seasons] = await Promise.all([
    getTournaments(),
    getSeasons('active'),
  ]);

  const completed = tournaments.filter((t) => t.status === 'completed');
  const active = tournaments.filter((t) => t.status === 'active');
  const roundsPlayed = completed.reduce((sum, t) => sum + (t.total_rounds || 0), 0);
  const latestCompleted = completed.slice(0, 6);
  const activeSeason = seasons[0];

  return (
    <main className="flex-1">
      <section className="lb-hero">
        <div className="lb-hero-grid" aria-hidden="true" />
        <div className="lb-hero-content">
          <div className="lb-hero-kicker">
            <span className="live-dot" />
            ARC Raiders community esports
          </div>
          <h1 className="lb-hero-title">
            Битва за Респект
          </h1>
          <p className="lb-hero-copy">
            Турнирный рейтинг для взрослых матчей ARC Raiders: чистая таблица,
            понятные режимы, MMR и история сезонов без лишнего визуального шума.
          </p>
          <div className="lb-hero-actions">
            <Link href="/standings" className="lb-primary-link">
              Смотреть рейтинг
            </Link>
            {activeSeason && (
              <Link href={`/season/${activeSeason.id}`} className="lb-secondary-link">
                Текущий сезон
              </Link>
            )}
          </div>
        </div>

        <aside className="lb-command-panel" aria-label="Статус турнира">
          <div className="lb-panel-header">
            <span>Состояние сети</span>
            <strong>ONLINE</strong>
          </div>
          <dl className="lb-stat-grid">
            <div>
              <dt>Турниры</dt>
              <dd>{completed.length}</dd>
            </div>
            <div>
              <dt>Активные</dt>
              <dd>{active.length}</dd>
            </div>
            <div>
              <dt>Раунды</dt>
              <dd>{roundsPlayed}</dd>
            </div>
          </dl>
          <div className="lb-mini-feed">
            <span>Последние матчи</span>
            {latestCompleted.length > 0 ? (
              latestCompleted.slice(0, 3).map((t) => (
                <Link key={t.id} href={`/standings/${t.id}`}>
                  <strong>{t.mode}</strong>
                  <span>{t.name}</span>
                </Link>
              ))
            ) : (
              <p>Завершённые турниры появятся после первых матчей.</p>
            )}
          </div>
        </aside>
      </section>

      <section className="lb-section">
        <div className="lb-section-heading">
          <p className="eyebrow">Tournament systems</p>
          <h2>Что показывает лидерборд</h2>
        </div>
        <div className="lb-feature-grid">
          <article className="lb-feature">
            <span>01</span>
            <h3>Режимы 1x1 и 2x2</h3>
            <p>Отдельная навигация для соло-рейдеров и командных составов.</p>
          </article>
          <article className="lb-feature">
            <span>02</span>
            <h3>MMR и история</h3>
            <p>Сезонный рейтинг, легенды прошлых турниров и результаты матчей.</p>
          </article>
          <article className="lb-feature">
            <span>03</span>
            <h3>Быстрый просмотр</h3>
            <p>Лёгкая таблица без тяжёлых ассетов, рассчитанная на частое обновление.</p>
          </article>
        </div>
      </section>

      {latestCompleted.length > 0 && (
        <section className="lb-section lb-section-last">
          <div className="lb-section-heading">
            <p className="eyebrow">Archive uplink</p>
            <h2>Завершённые турниры</h2>
          </div>
          <div className="lb-tournament-list">
            {latestCompleted.map((t) => (
              <Link key={t.id} href={`/standings/${t.id}`} className="lb-tournament-card">
                <span>{t.mode}</span>
                <strong>{t.name}</strong>
                <small>
                  {t.completed_at
                    ? new Date(t.completed_at).toLocaleDateString('ru-RU')
                    : 'в процессе'}
                </small>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
