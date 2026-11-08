import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ScheduleResult } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { useFormatters } from '@/hooks/use-formatters';
import { round } from '@/lib/utils';

interface WorkloadChartProps {
  schedule: ScheduleResult;
}

interface ChartRow {
  day: string;
  dateKey: string;
  fixed: number;
  study: number;
  remaining: number;
}

interface TooltipItem {
  dataKey?: string | number;
  value?: number | string;
}

function ChartTooltip({
  active,
  payload,
  label,
  labels,
  unit,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
  labels: Record<string, string>;
  unit: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      <ul className="flex flex-col gap-0.5">
        {payload.map((item) => (
          <li key={String(item.dataKey)} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{labels[String(item.dataKey)] ?? ''}</span>
            <span className="tabular-nums text-foreground">
              {Number(item.value ?? 0)} {unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WorkloadChart({ schedule }: WorkloadChartProps) {
  const { t } = useTranslation();
  const format = useFormatters();

  const rows: ChartRow[] = schedule.days.map((day) => {
    const remaining = Math.max(0, day.freeMinutes - day.studyMinutes);
    return {
      day: format.weekdayShort(day.date),
      dateKey: day.date,
      fixed: round(day.fixedMinutes / 60, 1),
      study: round(day.studyMinutes / 60, 1),
      remaining: round(remaining / 60, 1),
    };
  });

  const hasData = rows.some((row) => row.fixed > 0 || row.study > 0 || row.remaining > 0);
  const labels = {
    fixed: t('overview.workload.fixed'),
    study: t('overview.workload.study'),
    remaining: t('overview.workload.remaining'),
  };

  return (
    <SectionCard
      title={t('overview.workload.title')}
      subtitle={t('overview.workload.subtitle')}
      className="h-full"
      action={
        <ul className="hidden items-center gap-3 sm:flex">
          {[
            { key: 'fixed', color: 'hsl(var(--chart-1))', label: labels.fixed },
            { key: 'study', color: 'hsl(var(--chart-2))', label: labels.study },
            { key: 'remaining', color: 'hsl(var(--chart-3))', label: labels.remaining },
          ].map((item) => (
            <li key={item.key} className="flex items-center gap-1.5 text-2xs text-muted-foreground">
              <span
                aria-hidden="true"
                className="size-2 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      }
    >
      {hasData ? (
        <div>
          <div
            className="h-[260px] w-full"
            role="img"
            aria-label={t('a11y.workloadChart')}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={18}>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  dy={6}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  width={48}
                  tickFormatter={(value: number) => format.number(value)}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                  content={<ChartTooltip labels={labels} unit={t('common.hoursShort')} />}
                />
                <Bar
                  dataKey="fixed"
                  stackId="load"
                  fill="hsl(var(--chart-1))"
                  radius={[0, 0, 2, 2]}
                />
                <Bar dataKey="study" stackId="load" fill="hsl(var(--chart-2))" />
                <Bar
                  dataKey="remaining"
                  stackId="load"
                  fill="hsl(var(--chart-3))"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 flex flex-col gap-1">
            {rows.map((row) => (
              <li key={row.dateKey} className="sr-only">
                {t('overview.workload.barA11y', {
                  day: format.weekday(row.dateKey),
                  fixed: row.fixed,
                  study: row.study,
                  remaining: row.remaining,
                })}
              </li>
            ))}
          </ul>
          <ul className="mt-2 flex flex-wrap items-center gap-3 sm:hidden">
            {[
              { key: 'fixed', color: 'hsl(var(--chart-1))', label: labels.fixed },
              { key: 'study', color: 'hsl(var(--chart-2))', label: labels.study },
              { key: 'remaining', color: 'hsl(var(--chart-3))', label: labels.remaining },
            ].map((item) => (
              <li key={item.key} className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex h-[240px] flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm text-muted-foreground">{t('overview.workload.empty')}</p>
          <p className="text-xs text-muted-foreground">{t('overview.workload.emptyHint')}</p>
        </div>
      )}
    </SectionCard>
  );
}
