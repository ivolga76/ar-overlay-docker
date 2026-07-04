// Rules page — editable tournament rules
// Fetches rules text from API on each request (revalidate: 0)

import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { DarkPanel } from '@/components/DarkPanel';
import { getApiBase } from '@/lib/admin-helpers';

export const metadata: Metadata = {
  title: 'Правила турниров — AR Overlay',
  description: 'Правила турниров Arc Raiders «Битва за Респект». Формат, контракты, протоколы, усложнения, награды.',
};

export const revalidate = 0;

async function getRulesText(): Promise<string> {
  try {
    const res = await fetch(`${getApiBase()}/api/rules`, { cache: 'no-store' });
    if (!res.ok) return '';
    const data = await res.json();
    return data.text || '';
  } catch {
    return '';
  }
}

function renderRules(text: string) {
  if (!text) {
    return (
      <DarkPanel className="py-16 text-center">
        <p className="text-text-muted text-lg">Правила пока не добавлены</p>
        <p className="text-text-muted text-sm mt-2">Администратор еще не загрузил текст правил турнира.</p>
      </DarkPanel>
    );
  }

  // Split into sections by double newlines
  const blocks = text.split(/\n\n+/);

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Section header (~ TEXT ~)
        const sectionMatch = trimmed.match(/^~\s*(.+?)\s*~$/);
        if (sectionMatch) {
          return (
            <DarkPanel key={i} className="p-6">
              <h2 className="heading-label">{sectionMatch[1]}</h2>
            </DarkPanel>
          );
        }

        // Lines starting with * become list items
        const lines = trimmed.split('\n');
        const hasBullets = lines.every(l => !l.trim() || l.trim().startsWith('*'));

        if (hasBullets && lines.some(l => l.trim().startsWith('*'))) {
          return (
            <DarkPanel key={i} className="p-5">
              <ul className="text-text-body text-sm space-y-1 list-disc list-inside">
                {lines.filter(l => l.trim()).map((line, j) => (
                  <li key={j}>{line.replace(/^\*\s*/, '')}</li>
                ))}
              </ul>
            </DarkPanel>
          );
        }

        // Regular paragraph
        const firstLine = lines[0] || '';
        // Heuristic: if first line is short (<=60 chars) and followed by more text, treat as heading
        if (firstLine.length <= 80 && lines.length > 1 && firstLine.endsWith('?')) {
          return (
            <DarkPanel key={i} className="p-5">
              <h3 className="text-sm font-heading font-bold text-text-primary mb-2">{firstLine}</h3>
              {lines.slice(1).filter(l => l.trim()).map((line, j) => (
                <p key={j} className="text-text-body text-sm leading-relaxed">{line.trim()}</p>
              ))}
            </DarkPanel>
          );
        }

        return (
          <DarkPanel key={i} className="p-5">
            {lines.filter(l => l.trim()).map((line, j) => (
              <p key={j} className="text-text-body text-sm leading-relaxed">{line.trim()}</p>
            ))}
          </DarkPanel>
        );
      })}
    </div>
  );
}

export default async function RulesPage() {
  const text = await getRulesText();

  return (
    <main className="flex-1">
      <PageHeader
        title="Правила турниров"
        subtitle="Турниры по Arc Raiders 1×1 и 2×2 «Битва за Респект» от Денис Блим."
        backHref="/"
        backLabel="На главную"
      />

      <section className="max-w-4xl mx-auto px-4 pb-20">
        {renderRules(text)}
      </section>
    </main>
  );
}
