import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="px-title text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="px-subtitle text-lg">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
