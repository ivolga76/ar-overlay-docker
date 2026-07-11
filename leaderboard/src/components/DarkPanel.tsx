// DarkPanel — semi-transparent panel matching the new cream/cyan design

import { type ReactNode } from 'react';

interface DarkPanelProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}

export function DarkPanel({
  children,
  className = '',
  hoverable = false,
  onClick,
}: DarkPanelProps) {
  const base = 'bg-[rgba(12,13,17,0.86)] border border-[rgba(234,224,205,0.12)] rounded-lg shadow-[0_20px_70px_rgba(0,0,0,0.32)]';
  const hover = hoverable ? 'transition-all duration-200 hover:border-[rgba(234,224,205,0.25)] hover:bg-[rgba(16,17,20,0.95)]' : '';

  return (
    <div className={`${base} ${hover} ${className}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {children}
    </div>
  );
}
