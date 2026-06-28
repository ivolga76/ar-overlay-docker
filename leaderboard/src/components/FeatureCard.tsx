// FeatureCard — 4-column grid card with 3D tilt and gradient hover
// Enhanced: perspective lift, rainbow border on hover, animated icon
// Full-image mode: when title is empty, image fills the entire card

import { type ReactNode } from 'react';
import { DarkPanel } from './DarkPanel';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({ icon, title, description, className = '' }: FeatureCardProps) {
  const isFullImage = !title && !description;

  return (
    <DarkPanel
      className={`card-tilt card-gradient-border ${isFullImage ? 'p-0 flex items-center justify-center overflow-hidden' : 'p-6 flex flex-col gap-3 text-center'} ${className}`}
      hoverable
    >
      {isFullImage ? (
        <span className="block w-full h-full">
          {icon}
        </span>
      ) : (
        <>
          <span className="text-3xl transition-transform duration-300 group-hover:scale-110 inline-block">
            {icon}
          </span>
          <h3 className="heading-label text-sm">{title}</h3>
          <p className="text-xs text-text-muted leading-relaxed">{description}</p>
        </>
      )}
    </DarkPanel>
  );
}
