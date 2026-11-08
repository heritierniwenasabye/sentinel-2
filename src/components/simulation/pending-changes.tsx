import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { AppData, ScenarioOp } from '@/types';
import { useFormatters } from '@/hooks/use-formatters';
import { describeOp } from '@/lib/simulation/describe';

interface PendingChangesProps {
  ops: ScenarioOp[];
  data: AppData;
  onRemove: (index: number) => void;
}

export function PendingChanges({ ops, data, onRemove }: PendingChangesProps) {
  const { t } = useTranslation();
  const format = useFormatters();

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('simulation.pending.title')}</h2>
          {ops.length > 0 ? <p className="mt-0.5 text-xs text-muted-foreground">
            {t('simulation.pending.subtitle', { count: ops.length })}
          </p> : null}
        </div>
      </div>
      {ops.length === 0 ? (
        <p className="px-4 py-5 text-xs leading-relaxed text-muted-foreground">
          {t('simulation.pending.empty')}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {ops.map((op, index) => (
            <li key={`${op.type}-${index}`} className="flex items-start gap-2 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                {describeOp(op, data, format).map((line, lineIndex) => (
                  <p key={lineIndex} className="text-xs leading-relaxed text-foreground">
                    {t(line.key, line.params)}
                  </p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={t('simulation.pending.remove')}
                className="flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
