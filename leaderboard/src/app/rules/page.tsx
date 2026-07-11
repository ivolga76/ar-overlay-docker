// Rules page — editable tournament rules with Markdown rendering
// V2: matches new dark/cream/cyan design

import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PageHeader } from '@/components/PageHeader';
import { DarkPanel } from '@/components/DarkPanel';
import { getApiBase } from '@/lib/admin-helpers';

export const metadata: Metadata = {
  title: 'Правила турниров — AR Overlay',
  description: 'Правила турниров Arc Raiders «Битва за Респект». Формат, контракты, протоколы, усложнения, награды.',
};

export const dynamic = 'force-dynamic';

async function getRulesText(): Promise<string> {
  try {
    const res = await fetch(`${getApiBase()}/api/rules`, { cache: 'no-store' });
    if (!res.ok) return '';
    const data = await res.json();
    return data.text || '';
  } catch { return ''; }
}

const markdownComponents = {
  h1: ({ children, ...props }: any) => (
    <h1 className="font-heading font-bold text-xl uppercase tracking-[0.04em] text-[#00e5ff] mb-4 mt-6 first:mt-0" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="font-heading font-bold text-base uppercase tracking-[0.03em] text-[#eae0cd] mb-3 mt-6 first:mt-0" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="text-sm font-heading font-bold text-[#eae0cd] mb-2 mt-5 first:mt-0" {...props}>{children}</h3>
  ),
  h4: ({ children, ...props }: any) => (
    <h4 className="text-xs font-heading font-bold text-[#00e5ff] uppercase tracking-wider mb-2 mt-4" {...props}>{children}</h4>
  ),
  p: ({ children, ...props }: any) => (
    <p className="text-[#cfc7b7] text-sm leading-relaxed mb-3" {...props}>{children}</p>
  ),
  ul: ({ children, ...props }: any) => (
    <ul className="text-[#cfc7b7] text-sm space-y-1.5 list-disc list-inside mb-4 ml-1" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="text-[#cfc7b7] text-sm space-y-1.5 list-decimal list-inside mb-4 ml-1" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: any) => (
    <li className="leading-relaxed" {...props}>{children}</li>
  ),
  strong: ({ children, ...props }: any) => (
    <strong className="font-bold text-[#eae0cd]" {...props}>{children}</strong>
  ),
  em: ({ children, ...props }: any) => (
    <em className="italic text-[#8b867b]" {...props}>{children}</em>
  ),
  hr: (props: any) => (
    <hr className="h-px my-6 border-0 bg-[linear-gradient(90deg,transparent_0%,rgba(234,224,205,0.15)_20%,rgba(234,224,205,0.25)_50%,rgba(234,224,205,0.15)_80%,transparent_100%)]" {...props} />
  ),
  blockquote: ({ children, ...props }: any) => (
    <blockquote className="border-l-2 border-[#00e5ff] pl-4 py-2 my-4 bg-[rgba(0,0,0,0.2)] rounded-r-lg" {...props}>{children}</blockquote>
  ),
  code: ({ children, ...props }: any) => (
    <code className="bg-[#0a0a0c] px-1.5 py-0.5 rounded text-xs font-mono text-[#00e5ff]" {...props}>{children}</code>
  ),
  pre: ({ children, ...props }: any) => (
    <pre className="bg-[#0a0a0c] p-4 rounded-lg overflow-x-auto text-xs font-mono text-[#cfc7b7] mb-4 border border-[rgba(234,224,205,0.1)]" {...props}>{children}</pre>
  ),
};

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
        {text ? (
          <DarkPanel className="p-6 md:p-8">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {text}
            </ReactMarkdown>
          </DarkPanel>
        ) : (
          <DarkPanel className="py-16 text-center">
            <p className="text-[#8b867b] text-lg">Правила пока не добавлены</p>
            <p className="text-[#8b867b] text-sm mt-2">Администратор еще не загрузил текст правил турнира.</p>
          </DarkPanel>
        )}
      </section>
    </main>
  );
}
