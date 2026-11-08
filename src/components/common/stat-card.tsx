import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'warning' | 'critical' | 'positive';
  className?: string;
}

const TONE_CLASS: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-foreground',
  warning: 'text-warning',
  critical: 'text-critical',
  positive: 'text-success',
};

export function StatCard({ label, value, hint, icon: Icon, tone = 'default', className }: StatCardProps) {
  return (
    <div className={cn('min-w-0 rounded-lg border border-border bg-card p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="label-caps min-w-0 [overflow-wrap:anywhere]">{label}</p>
        {Icon ? (
          <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        ) : null}
      </div>
      <p className={cn('mt-2.5 text-2xl font-semibold tabular-nums leading-none', TONE_CLASS[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-2xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
