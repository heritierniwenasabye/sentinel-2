import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, Plus } from 'lucide-react';
import type { DigitalUsageEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/page-header';
import { StatCard } from '@/components/common/stat-card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { UsageGoals } from '@/components/habits/usage-goals';
import { UsageDialog } from '@/components/habits/usage-dialog';
import { UsageTable } from '@/components/habits/usage-table';
import { UsageByAppChart, UsageCategoryChart, UsageTrendChart } from '@/components/habits/usage-charts';
import { HabitSimulator } from '@/components/habits/habit-simulator';
import { useClock } from '@/hooks/use-clock';
import { useApp } from '@/hooks/use-app';
import { useToast } from '@/components/ui/toast';
import { useFormatters } from '@/hooks/use-formatters';
import { summarizeUsage } from '@/lib/analytics/habits';

export function HabitsPage() {
  const { t } = useTranslation();
  const format = useFormatters();
  const { usage, deleteUsage } = useApp();
  const { notify } = useToast();
  const now = useClock();
  const summary = useMemo(() => summarizeUsage(usage, now), [usage, now]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DigitalUsageEntry | null>(null);
  const [toDelete, setToDelete] = useState<DigitalUsageEntry | null>(null);

  return (
    <div className="page-enter flex flex-col gap-5">
      <PageHeader
        title={t('habits.title')}
        subtitle={t('habits.subtitle')}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus aria-hidden="true" />
            {t('habits.addEntry')}
          </Button>
        }
        meta={
          <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-muted-foreground">
            <Info aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
            {t('habits.disclaimer')}
          </p>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('habits.metrics.total')}
          value={format.duration(summary.totalMinutes)}
          hint={t('habits.metrics.totalHint')}
        />
        <StatCard
          label={t('habits.metrics.average')}
          value={format.duration(summary.dailyAverageMinutes)}
          hint={t('habits.metrics.averageHint')}
        />
        <StatCard
          label={t('habits.metrics.days')}
          value={format.number(summary.recordedDays)}
          hint={t('habits.metrics.daysHint')}
        />
        <StatCard
          label={t('habits.metrics.discretionary')}
          value={format.duration(summary.discretionaryMinutes)}
          hint={t('habits.metrics.discretionaryHint')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <UsageTrendChart summary={summary} />
        </div>
        <UsageCategoryChart summary={summary} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <UsageTable
            entries={usage}
            onEdit={(entry) => {
              setEditing(entry);
              setDialogOpen(true);
            }}
            onDelete={(entry) => setToDelete(entry)}
          />
        </div>
        <UsageByAppChart summary={summary} />
      </div>

      <UsageGoals />

      <HabitSimulator summary={summary} />

      <UsageDialog open={dialogOpen} onOpenChange={setDialogOpen} entry={editing} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title={t('habits.deleteTitle')}
        description={t('habits.deleteBody', {
          app: toDelete?.app ?? '',
          date: toDelete ? format.date(`${toDelete.date}T12:00:00`, 'd MMM') : '',
        })}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={() => {
          if (!toDelete) return;
          deleteUsage(toDelete.id);
          notify({ title: t('toast.usageDeleted') });
          setToDelete(null);
        }}
      />
    </div>
  );
}
