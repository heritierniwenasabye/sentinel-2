import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import type { WorkloadAnalysis } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const BAND_TONE: Record<WorkloadAnalysis['band'], 'success' | 'warning' | 'critical'> = {
  balanced: 'success',
  elevated: 'warning',
  high: 'critical',
};

const BAND_BAR: Record<WorkloadAnalysis['band'], string> = {
  balanced: 'bg-success',
  elevated: 'bg-warning',
  high: 'bg-critical',
};

export function PressureCard({ analysis }: { analysis: WorkloadAnalysis }) {
  const { t } = useTranslation();

  return (
    <SectionCard title={t('insights.pressure.title')} subtitle={t('insights.pressure.subtitle')}>
      <div
        className="flex flex-col gap-4"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={analysis.score}
        aria-label={t('a11y.pressureScore', { score: analysis.score })}
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="label-caps">{t('insights.pressure.score')}</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums leading-none text-foreground">
              {analysis.score}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/ 100</span>
            </p>
          </div>
          <Badge tone={BAND_TONE[analysis.band]}>{t(`insights.pressure.${analysis.band}`)}</Badge>
        </div>

        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-[width]', BAND_BAR[analysis.band])}
              style={{ width: `${Math.max(2, analysis.score)}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-2xs text-muted-foreground">
            <span>{t('insights.pressure.scaleLow')}</span>
            <span>{t('insights.pressure.scaleHigh')}</span>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(`insights.pressure.${analysis.band}Hint`)}
        </p>

        <p className="flex items-start gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-2 text-2xs leading-relaxed text-muted-foreground">
          <Info aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
          {t('insights.pressure.disclaimer')}
        </p>
      </div>
    </SectionCard>
  );
}
