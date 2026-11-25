import * as React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-ink-200/70', className)} {...props} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn('h-5 w-5 animate-spin rounded-full border-2 border-ink-200 border-t-navy-500', className)}
    />
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 px-6 py-14 text-center">
      {icon && <div className="text-ink-400">{icon}</div>}
      <div>
        <p className="text-sm font-semibold text-ink-700">{title}</p>
        {description && <p className="mt-1 text-xs text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export default EmptyState;
