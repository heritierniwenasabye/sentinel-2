import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ScheduleResult } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { useFormatters } from '@/hooks/use-formatters';
import { round } from '@/lib/utils';

interface ComparisonChartProps {
  baseline: ScheduleResult;
  simulated: ScheduleResult;
}

interface TooltipItem {
  dataKey?: string | number;
  value?: number | string;
}

function ComparisonTooltip({
  active,
  payload,
  label,
  labels,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
  labels: Record<string, string>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      <ul className="flex flex-col gap-0.5">
        {payload.map((item) => (
          <li key={String(item.dataKey)} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{labels[String(item.dataKey)] ?? ''}</span>
            <span className="tabular-nums text-foreground">{Number(item.value ?? 0)} min</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ComparisonChart({ baseline, simulated }: ComparisonChartProps) {
  const { t } = useTranslation();
  const format = useFormatters();

  const rows = simulated.days.map((day, index) => ({
    day: format.weekdayShort(day.date),
    dateKey: day.date,
    baseline: round((baseline.days[index]?.studyMinutes ?? 0) / 60, 2),
    simulated: round(day.studyMinutes / 60, 2),
  }));

  const hasData = rows.some((row) => row.baseline > 0 || row.simulated > 0);
  const labels = {
    baseline: t('simulation.compare.chartBaseline'),
    simulated: t('simulation.compare.chartSimulated'),
  };

  return (
    <SectionCard
      title={t('simulation.compare.chartTitle')}
      subtitle={t('simulation.compare.chartSubtitle')}
    >
      {hasData ? (
        <>
          <div className="h-[240px] w-full" role="img" aria-label={t('a11y.simulationChart')}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={16}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
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
                  width={44}
                  tickFormatter={(value: number) => format.number(value)}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                  content={<ComparisonTooltip labels={labels} />}
                />
                <Bar dataKey="baseline" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
                <Bar dataKey="simulated" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex items-center gap-4">
            <li className="flex items-center gap-1.5 text-2xs text-muted-foreground">
              <span aria-hidden="true" className="size-2 rounded-sm bg-chart-1" />
              {labels.baseline}
            </li>
            <li className="flex items-center gap-1.5 text-2xs text-muted-foreground">
              <span aria-hidden="true" className="size-2 rounded-sm bg-primary" />
              {labels.simulated}
            </li>
            <li className="ml-auto text-2xs text-muted-foreground">{t('overview.workload.hoursAxis')}</li>
          </ul>
          <table className="sr-only">
            <caption>{t('a11y.simulationChart')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('common.date')}</th>
                <th scope="col">{labels.baseline}</th>
                <th scope="col">{labels.simulated}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.dateKey}>
                  <th scope="row">{format.weekday(row.dateKey)}</th>
                  <td>{row.baseline}</td>
                  <td>{row.simulated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="flex h-[180px] items-center justify-center">
          <p className="text-sm text-muted-foreground">{t('simulation.compare.chartEmpty')}</p>
        </div>
      )}
    </SectionCard>
  );
}
