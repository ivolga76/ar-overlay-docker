// DarkPanel — semi-transparent panel with blue accent border

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
  const baseClass = `dark-panel ${hoverable ? 'dark-panel-hover' : ''} ${className}`;

  return (
    <div className={baseClass} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {children}
    </div>
  );
}
