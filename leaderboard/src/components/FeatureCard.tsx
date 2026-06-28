// FeatureCard — 4-column grid card with 3D tilt and gradient hover
// Enhanced: perspective lift, rainbow border on hover, animated icon

import { type ReactNode } from 'react';
import { DarkPanel } from './DarkPanel';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({ icon, title, description, className = '' }: FeatureCardProps) {
  return (
    <DarkPanel
      className={`p-6 flex flex-col gap-3 text-center card-tilt card-gradient-border ${className}`}
      hoverable
    >
      <span className="text-3xl transition-transform duration-300 group-hover:scale-110 inline-block">
        {icon}
      </span>
      <h3 className="heading-label text-sm">{title}</h3>
      <p className="text-xs text-text-muted leading-relaxed">{description}</p>
    </DarkPanel>
  );
}
