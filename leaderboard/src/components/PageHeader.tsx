// PageHeader — consistent page header with ARC Raiders branding
// V2: matches the new dark/cream/cyan design system

import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
}

export function PageHeader({ title, subtitle, backHref, backLabel }: PageHeaderProps) {
  return (
    <header className="relative mb-8 overflow-hidden rounded-lg border border-[rgba(234,224,205,0.1)] bg-[rgba(12,13,17,0.86)]">
      {/* Diagonal rainbow accent — top edge */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[linear-gradient(90deg,#0080ff,#00cc44,#e83030,#ffcc00)]" aria-hidden="true" />

      <div className="px-6 py-12 text-center">
        {/* Back link */}
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[#00e5ff] hover:text-[#eae0cd] font-heading font-bold mb-5 transition-colors"
          >
            <span className="text-base">‹</span>
            {backLabel ?? 'Назад'}
          </Link>
        )}

        <p className="font-heading font-bold text-[0.7rem] uppercase tracking-[0.15em] text-[#00e5ff] mb-3">
          ТУРНИР
        </p>
        <h1 className="font-heading font-extrabold text-2xl md:text-3xl uppercase tracking-[0.02em] text-[#eae0cd] [text-shadow:0_0_8px_rgba(0,229,255,0.3),0_0_24px_rgba(0,229,255,0.1)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-[#8b867b] text-sm max-w-lg mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
