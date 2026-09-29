import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-white/80 p-5 shadow-cozy backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}
