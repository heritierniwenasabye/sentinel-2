import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import type { Insight } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { cn } from '@/lib/utils';

const TONE: Record<Insight['tone'], { className: string; icon: typeof Info }> = {
  positive: { className: 'border-success/25 bg-success/5 text-success', icon: CheckCircle2 },
  info: { className: 'border-border bg-muted/40 text-muted-foreground', icon: Info },
  warning: { className: 'border-warning/25 bg-warning/5 text-warning', icon: AlertCircle },
  critical: { className: 'border-critical/25 bg-critical/5 text-critical', icon: TriangleAlert },
};

export function InsightList({ insights }: { insights: Insight[] }) {
  const { t } = useTranslation();

  return (
    <SectionCard title={t('insights.generated.title')} subtitle={t('insights.generated.subtitle')}>
      {insights.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('insights.generated.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {insights.map((insight) => {
            const tone = TONE[insight.tone];
            const Icon = tone.icon;
            return (
              <li
                key={insight.id}
                className={cn('flex items-start gap-2 rounded-md border px-3 py-2', tone.className)}
              >
                <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                <p className="text-xs leading-relaxed text-foreground">
                  {t(insight.key, insight.params)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
