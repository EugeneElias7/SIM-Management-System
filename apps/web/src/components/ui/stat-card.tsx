import * as React from 'react';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = 'navy',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  accent?: 'navy' | 'amber' | 'red' | 'green' | 'slate';
}) {
  const accentClasses = {
    navy: 'bg-navy-50 text-navy-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    slate: 'bg-ink-100 text-ink-600',
  }[accent];
  return (
    <div className="card flex items-center gap-4 p-5">
      {icon && (
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', accentClasses)}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink-900">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
      </div>
    </div>
  );
}
export default StatCard;
