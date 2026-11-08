import { useTranslation } from 'react-i18next';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { UsageCategory } from '@/types';
import type { HabitsSummary } from '@/lib/analytics/habits';
import { SectionCard } from '@/components/common/section-card';
import { useFormatters } from '@/hooks/use-formatters';
import { EmptyState } from '@/components/common/empty-state';
import { ChartColumn } from 'lucide-react';

const CATEGORY_KEY: Record<UsageCategory, string> = {
  social: 'common.categorySocial',
  entertainment: 'common.categoryEntertainment',
  education: 'common.categoryEducation',
  productivity: 'common.categoryProductivity',
  other: 'common.categoryOther',
};

export function UsageTrendChart({ summary }: { summary: HabitsSummary }) {
  const { t } = useTranslation();
  const format = useFormatters();

  const rows = summary.last7Days.map((day) => ({
    dateKey: day.date,
    day: format.weekdayShort(day.date),
    minutes: day.minutes,
  }));

  const hasData = rows.some((row) => row.minutes > 0);

  return (
    <SectionCard title={t('habits.trend.title')} subtitle={t('habits.trend.subtitle')}>
      {hasData ? (
        <>
          <div className="h-[220px] w-full" role="img" aria-label={t('a11y.habitsTrendChart')}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={20}>
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
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
                        <p className="font-medium text-foreground">{label}</p>
                        <p className="tabular-nums text-muted-foreground">
                          {format.duration(Number(payload[0]?.value ?? 0))}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>{t('a11y.habitsTrendChart')}</caption>
            <tbody>
              {summary.last7Days.map((day) => (
                <tr key={day.date}>
                  <th scope="row">{format.date(`${day.date}T12:00:00`, 'EEEE d MMM')}</th>
                  <td>{format.duration(day.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <EmptyState
          icon={ChartColumn}
          title={t('habits.trend.empty')}
          hint={t('habits.emptyHint')}
          compact
        />
      )}
    </SectionCard>
  );
}

export function UsageCategoryChart({ summary }: { summary: HabitsSummary }) {
  const { t } = useTranslation();
  const format = useFormatters();

  return (
    <SectionCard title={t('habits.byCategory.title')} subtitle={t('habits.byCategory.subtitle')}>
      {summary.byCategory.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('habits.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {summary.byCategory.map((row) => (
            <li key={row.category}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-foreground">{t(CATEGORY_KEY[row.category])}</span>
                <span className="tabular-nums text-muted-foreground">
                  {format.duration(row.minutes)} · {format.percent(row.share)}
                </span>
              </div>
              <div
                className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={row.share}
                aria-label={t(CATEGORY_KEY[row.category])}
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(2, row.share)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function UsageByAppChart({ summary }: { summary: HabitsSummary }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const rows = summary.byApp.slice(0, 6);

  if (rows.length === 0) {
    return (
      <SectionCard title={t('habits.byApp.title')} subtitle={t('habits.byApp.subtitle')}>
        <p className="text-xs text-muted-foreground">{t('habits.byApp.empty')}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={t('habits.byApp.title')} subtitle={t('habits.byApp.subtitle')}>
      <div
        style={{ height: `${rows.length * 34 + 12}px` }}
        role="img"
        aria-label={t('a11y.usageByAppChart')}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
            barSize={10}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="app"
              width={84}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
                    <p className="font-medium text-foreground">{String(payload[0]?.payload?.app ?? '')}</p>
                    <p className="tabular-nums text-muted-foreground">
                      {format.duration(Number(payload[0]?.value ?? 0))}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="minutes" fill="hsl(var(--chart-2))" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {rows.map((row) => (
          <li key={row.app}>
            {row.app}: {format.duration(row.minutes)}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
