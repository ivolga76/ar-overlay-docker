// FeatureCard — grid card with hover lift and accent border

import { type ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({ icon, title, description, className = '' }: FeatureCardProps) {
  return (
    <div className={`bg-[rgba(12,13,17,0.86)] border border-[rgba(234,224,205,0.12)] rounded-lg shadow-[0_20px_70px_rgba(0,0,0,0.32)] p-6 flex flex-col gap-3 text-center transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,229,255,0.2)] ${className}`}>
      <span className="text-3xl transition-transform duration-300 group-hover:scale-110 inline-block">
        {icon}
      </span>
      <h3 className="font-heading font-bold text-sm uppercase tracking-[0.03em] text-[#eae0cd]">{title}</h3>
      <p className="text-xs text-[#8b867b] leading-relaxed">{description}</p>
    </div>
  );
}
