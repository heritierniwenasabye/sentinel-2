import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { UsageGoal } from '@/types';
import { useApp } from '@/hooks/use-app';
import { useClock } from '@/hooks/use-clock';
import { useFormatters } from '@/hooks/use-formatters';
import { goalProgress } from '@/lib/analytics/goals';
import { createId } from '@/lib/utils';
import { SectionCard } from '@/components/common/section-card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Label, FieldError } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export function UsageGoals() {
  const { t } = useTranslation();
  const { usageGoals, usage, saveUsageGoal, deleteUsageGoal } = useApp();
  const now = useClock();
  const format = useFormatters();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UsageGoal | null>(null);
  const [removing, setRemoving] = useState<UsageGoal | null>(null);
  const [app, setApp] = useState('');
  const [limit, setLimit] = useState('60');
  const [error, setError] = useState('');
  const edit = (goal: UsageGoal | null) => {
    setEditing(goal); setApp(goal?.app ?? ''); setLimit(String(goal?.dailyLimitMinutes ?? 60)); setError(''); setOpen(true);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const minutes = Number(limit);
    if (!app.trim() || app.trim().length > 80 || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440 || usageGoals.some(g => g.id !== editing?.id && g.app.trim().toLowerCase() === app.trim().toLowerCase())) {
      setError(t('goals.invalid')); return;
    }
    saveUsageGoal({ id: editing?.id ?? createId('goal'), app: app.trim(), dailyLimitMinutes: minutes }); setOpen(false);
  };
  return <SectionCard title={t('goals.title')} subtitle={t('goals.description')} action={<Button size="sm" onClick={() => edit(null)}>{t('goals.add')}</Button>}>
    {usageGoals.length === 0 ? <p className="text-xs text-muted-foreground">{t('goals.empty')}</p> : <ul className="flex flex-col gap-3">{usageGoals.map(goal => {
      const progress = goalProgress(goal, usage, now);
      return <li key={goal.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
        <div className="min-w-0"><p className="break-words text-sm font-medium">{goal.app}</p><p className="text-xs text-muted-foreground">{t('goals.limitValue', { minutes: goal.dailyLimitMinutes })}</p>
          <p className="text-xs" role="status">{!progress.recorded ? t('goals.missing') : t(progress.over > 0 ? 'goals.over' : 'goals.progress', { used: format.duration(progress.minutes), remaining: format.duration(progress.over || progress.remaining) })}</p>
        </div><div className="flex gap-2"><Button size="sm" variant="secondary" aria-label={`${t('common.edit')}: ${goal.app} ${t('goals.title')}`} onClick={() => edit(goal)}>{t('common.edit')}</Button><Button size="sm" variant="ghost" aria-label={`${t('common.delete')}: ${goal.app} ${t('goals.title')}`} onClick={() => setRemoving(goal)}>{t('common.delete')}</Button></div>
      </li>;
    })}</ul>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{t(editing ? 'goals.edit' : 'goals.add')}</DialogTitle><DialogDescription>{t('goals.description')}</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate><Label htmlFor="goal-app">{t('goals.app')}</Label><Input id="goal-app" value={app} maxLength={80} onChange={e => setApp(e.target.value)} autoFocus aria-invalid={!!error} aria-describedby={error ? 'goal-error' : undefined}/>
        <Label htmlFor="goal-limit">{t('goals.limit')}</Label><Input id="goal-limit" type="number" min={1} max={1440} step={1} value={limit} onChange={e => setLimit(e.target.value)} aria-invalid={!!error} aria-describedby={error ? 'goal-error' : undefined}/><FieldError id="goal-error">{error}</FieldError>
        <DialogFooter><Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button><Button type="submit">{t('common.save')}</Button></DialogFooter>
      </form></DialogContent></Dialog>
    <ConfirmDialog open={!!removing} onOpenChange={value => { if (!value) setRemoving(null); }} title={t('goals.deleteTitle')} description={t('goals.deleteBody', { app: removing?.app ?? '' })} confirmLabel={t('common.delete')} destructive onConfirm={() => { if (removing) deleteUsageGoal(removing.id); setRemoving(null); }}/>
  </SectionCard>;
}
