import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { Explanation } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { cn } from '@/lib/utils';

const TONE_STYLE: Record<Explanation['tone'], { className: string; icon: typeof Info }> = {
  info: { className: 'border-border bg-muted/40 text-muted-foreground', icon: Info },
  positive: { className: 'border-success/25 bg-success/5 text-success', icon: CheckCircle2 },
  warning: { className: 'border-warning/25 bg-warning/5 text-warning', icon: AlertCircle },
  critical: { className: 'border-critical/25 bg-critical/5 text-critical', icon: AlertCircle },
};

export function Explanations({ explanations }: { explanations: Explanation[] }) {
  const { t } = useTranslation();

  return (
    <SectionCard
      title={t('simulation.compare.explanationsTitle')}
      contentClassName="pt-2"
    >
      {explanations.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('simulation.compare.explanationsEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {explanations.map((explanation) => {
            const tone = TONE_STYLE[explanation.tone];
            const Icon = tone.icon;
            return (
              <li
                key={explanation.id}
                className={cn('flex items-start gap-2 rounded-md border px-3 py-2', tone.className)}
              >
                <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                <p className="text-xs leading-relaxed text-foreground">
                  {t(explanation.key, explanation.params)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
