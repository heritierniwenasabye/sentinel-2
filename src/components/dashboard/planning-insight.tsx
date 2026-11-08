import { useTranslation } from 'react-i18next';
import { AlertCircle, Info, Lightbulb, ShieldCheck } from 'lucide-react';
import type { Insight, ScheduleResult, WorkloadAnalysis } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { useFormatters } from '@/hooks/use-formatters';
import { buildPlanningInsight } from '@/lib/analytics/insights';
import { cn } from '@/lib/utils';

interface PlanningInsightProps {
  schedule: ScheduleResult;
  analysis: WorkloadAnalysis;
}

const TONE_STYLES: Record<Insight['tone'], { box: string; icon: typeof Info }> = {
  positive: { box: 'border-success/25 bg-success/5 text-success', icon: ShieldCheck },
  info: { box: 'border-border bg-muted/50 text-muted-foreground', icon: Info },
  warning: { box: 'border-warning/25 bg-warning/5 text-warning', icon: AlertCircle },
  critical: { box: 'border-critical/25 bg-critical/5 text-critical', icon: AlertCircle },
};

export function PlanningInsight({ schedule, analysis }: PlanningInsightProps) {
  const { t } = useTranslation();
  const format = useFormatters();

  const insight = buildPlanningInsight(schedule, analysis, (key) => format.weekday(key));
  const tone = insight ? TONE_STYLES[insight.tone] : null;
  const Icon = tone?.icon ?? Lightbulb;

  return (
    <SectionCard
      title={t('overview.insight.title')}
      subtitle={t('insights.scopeTitle')}
      className="h-full"
    >
      {insight && tone ? (
        <div className={cn('flex h-full flex-col justify-between gap-4 rounded-md border p-3.5', tone.box)}>
          <div className="flex items-start gap-2.5">
            <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
            <p className="text-sm leading-relaxed text-foreground">
              {t(insight.key, insight.params)}
            </p>
          </div>
          <p className="text-2xs leading-relaxed text-muted-foreground">
            {t('insights.formula.totalHint')}
          </p>
        </div>
      ) : (
        <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-1 text-center">
          <Lightbulb aria-hidden="true" className="size-5 text-muted-foreground/70" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">{t('overview.insight.empty')}</p>
        </div>
      )}
    </SectionCard>
  );
}
