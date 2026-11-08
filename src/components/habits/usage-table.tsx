import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Smartphone, Trash2 } from 'lucide-react';
import type { DigitalUsageEntry, UsageCategory } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/common/empty-state';
import { useFormatters } from '@/hooks/use-formatters';

interface UsageTableProps {
  entries: DigitalUsageEntry[];
  onEdit: (entry: DigitalUsageEntry) => void;
  onDelete: (entry: DigitalUsageEntry) => void;
}

const CATEGORY_KEY: Record<UsageCategory, string> = {
  social: 'common.categorySocial',
  entertainment: 'common.categoryEntertainment',
  education: 'common.categoryEducation',
  productivity: 'common.categoryProductivity',
  other: 'common.categoryOther',
};

const FILTERS: (UsageCategory | 'all')[] = [
  'all',
  'social',
  'entertainment',
  'education',
  'productivity',
  'other',
];

export function UsageTable({ entries, onEdit, onDelete }: UsageTableProps) {
  const { t } = useTranslation();
  const format = useFormatters();
  const [filter, setFilter] = useState<UsageCategory | 'all'>('all');

  const rows = useMemo(() => {
    const filtered = filter === 'all' ? entries : entries.filter((entry) => entry.category === filter);
    return [...filtered].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.minutes - a.minutes;
    });
  }, [entries, filter]);

  return (
    <SectionCard
      title={t('habits.logTitle')}
      subtitle={t('habits.logSubtitle', { count: new Set(entries.map((entry) => entry.date)).size })}
      action={
        <div className="w-[150px]">
          <Select
            aria-label={t('habits.filters.label')}
            value={filter}
            onChange={(next) => setFilter(next as UsageCategory | 'all')}
            className="h-8 text-xs"
            options={FILTERS.map((value) => ({
              value,
              label: value === 'all' ? t('habits.filters.all') : t(CATEGORY_KEY[value]),
            }))}
          />
        </div>
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={Smartphone}
          title={t('habits.empty')}
          hint={t('habits.emptyHint')}
          compact
        />
      ) : (
        <div className="scroll-area -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[460px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border text-2xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="py-1.5 pr-2 font-medium">
                  {t('habits.table.app')}
                </th>
                <th scope="col" className="py-1.5 pr-2 font-medium">
                  {t('habits.table.date')}
                </th>
                <th scope="col" className="py-1.5 pr-2 text-right font-medium">
                  {t('habits.table.duration')}
                </th>
                <th scope="col" className="py-1.5 pr-2 font-medium">
                  {t('habits.table.category')}
                </th>
                <th scope="col" className="py-1.5 text-right font-medium">
                  {t('habits.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.id} className="border-b border-border/70 last:border-0">
                  <td className="py-2 pr-2 font-medium text-foreground">{entry.app}</td>
                  <td className="py-2 pr-2 tabular-nums text-muted-foreground">
                    {format.date(`${entry.date}T12:00:00`, 'd MMM')}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-foreground">
                    {format.duration(entry.minutes)}
                  </td>
                  <td className="py-2 pr-2">
                    <Badge tone="neutral">{t(CATEGORY_KEY[entry.category])}</Badge>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(entry)}
                        aria-label={`${t('common.edit')}: ${entry.app}`}
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(entry)}
                        aria-label={`${t('common.delete')}: ${entry.app}`}
                        className="hover:text-critical"
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
