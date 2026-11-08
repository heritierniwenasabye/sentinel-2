import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { Plus } from 'lucide-react';
import type { Commitment, ScenarioOp, Task, UserPreferences } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Label, FieldError } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useFormatters } from '@/hooks/use-formatters';
import { createId } from '@/lib/utils';
import { toLocalIso } from '@/lib/date';

type ScenarioType =
  | 'addShift'
  | 'removeCommitment'
  | 'changeTask'
  | 'addRest'
  | 'studyWindow'
  | 'screenTime';

interface ScenarioBuilderProps {
  weekStart: Date;
  tasks: Task[];
  commitments: Commitment[];
  preferences: UserPreferences;
  onAdd: (op: ScenarioOp) => void;
}

const TYPES: ScenarioType[] = [
  'addShift',
  'removeCommitment',
  'changeTask',
  'addRest',
  'studyWindow',
  'screenTime',
];

function buildLocalIso(date: string, time: string): string | null {
  const parsed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return toLocalIso(parsed);
}

export function ScenarioBuilder({
  weekStart,
  tasks,
  commitments,
  preferences,
  onAdd,
}: ScenarioBuilderProps) {
  const { t } = useTranslation();
  const formatDate = useFormatters();
  const [type, setType] = useState<ScenarioType>('addShift');
  const [error, setError] = useState<string | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');

  const [shift, setShift] = useState({ title: '', date: today, start: '18:00', end: '21:00' });
  const [removeId, setRemoveId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskDuration, setTaskDuration] = useState('');
  const [rest, setRest] = useState({ title: '', date: today, start: '20:00', end: '21:00' });
  const [window, setWindow] = useState({
    start: preferences.studyStart,
    end: preferences.studyEnd,
  });
  const [screen, setScreen] = useState({ minutes: '180', allocate: false });

  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const weekCommitments = useMemo(
    () =>
      commitments
        .filter((commitment) => parseISO(commitment.end) > weekStart && parseISO(commitment.start) < weekEnd)
        .sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime()),
    [commitments, weekStart, weekEnd],
  );
  const openTasks = useMemo(
    () => tasks.filter((task) => !task.completed).sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [tasks],
  );

  const reset = () => {
    setError(null);
  };

  const submitShift = (event: FormEvent) => {
    event.preventDefault();
    const start = buildLocalIso(shift.date, shift.start);
    const end = buildLocalIso(shift.date, shift.end);
    if (!shift.title.trim()) return setError(t('simulation.forms.errorTitle'));
    if (!start || !end || new Date(end) <= new Date(start)) {
      return setError(t('simulation.forms.errorRange'));
    }
    onAdd({
      type: 'add-commitment',
      commitment: {
        id: createId('shift'),
        title: shift.title.trim(),
        category: 'work',
        start,
        end,
        notes: '',
      },
    });
    setShift((current) => ({ ...current, title: '' }));
    reset();
  };

  const submitRemove = (event: FormEvent) => {
    event.preventDefault();
    if (!removeId) return setError(t('simulation.forms.errorCommitment'));
    onAdd({ type: 'remove-commitment', commitmentId: removeId });
    setRemoveId('');
    reset();
  };

  const submitTask = (event: FormEvent) => {
    event.preventDefault();
    if (!taskId) return setError(t('simulation.forms.errorTask'));
    const patch: { deadline?: string; estimatedMinutes?: number } = {};
    if (taskDeadline) {
      const parsed = new Date(taskDeadline);
      if (Number.isNaN(parsed.getTime())) return setError(t('simulation.forms.errorDeadline'));
      patch.deadline = toLocalIso(parsed);
    }
    if (taskDuration) {
      const minutes = Number(taskDuration);
      if (!Number.isFinite(minutes) || minutes < 0) {
        return setError(t('planner.taskDialog.errorDuration'));
      }
      patch.estimatedMinutes = Math.round(minutes);
    }
    if (Object.keys(patch).length === 0) return setError(t('simulation.forms.errorTask'));
    onAdd({ type: 'update-task', taskId, patch });
    setTaskDeadline('');
    setTaskDuration('');
    reset();
  };

  const submitRest = (event: FormEvent) => {
    event.preventDefault();
    const start = buildLocalIso(rest.date, rest.start);
    const end = buildLocalIso(rest.date, rest.end);
    if (!rest.title.trim()) return setError(t('simulation.forms.errorTitle'));
    if (!start || !end || new Date(end) <= new Date(start)) {
      return setError(t('simulation.forms.errorRange'));
    }
    onAdd({
      type: 'add-commitment',
      commitment: {
        id: createId('rest'),
        title: rest.title.trim(),
        category: 'rest',
        start,
        end,
        notes: '',
      },
    });
    setRest((current) => ({ ...current, title: '' }));
    reset();
  };

  const submitWindow = (event: FormEvent) => {
    event.preventDefault();
    if (window.end <= window.start) return setError(t('simulation.forms.errorWindow'));
    onAdd({ type: 'study-window', start: window.start, end: window.end });
    reset();
  };

  const submitScreen = (event: FormEvent) => {
    event.preventDefault();
    const minutes = Number(screen.minutes);
    if (!Number.isFinite(minutes) || minutes < 30 || minutes > 1440) {
      return setError(t('simulation.forms.errorReduction'));
    }
    onAdd({
      type: 'screen-time',
      weeklyReductionMinutes: Math.round(minutes),
      allocateToSchedule: screen.allocate,
    });
    reset();
  };

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3.5">
        <h2 className="text-sm font-semibold text-foreground">{t('simulation.scenarioTitle')}</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {t('simulation.scenarioSubtitle')}
        </p>
      </div>

      <Tabs
        value={type}
        onValueChange={(value) => {
          setType(value as ScenarioType);
          reset();
        }}
        className="p-3 sm:p-4"
      >
        <TabsList>
          {TYPES.map((item) => (
            <TabsTrigger key={item} value={item}>
              {t(`simulation.types.${item}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="addShift">
          <form onSubmit={submitShift} className="flex flex-col gap-3" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shift-title">{t('simulation.forms.shiftTitle')}</Label>
              <Input
                id="shift-title"
                value={shift.title}
                onChange={(event) => setShift((current) => ({ ...current, title: event.target.value }))}
                placeholder={t('simulation.forms.shiftTitlePlaceholder')}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shift-date">{t('simulation.forms.date')}</Label>
                <Input
                  id="shift-date"
                  type="date"
                  value={shift.date}
                  onChange={(event) => setShift((current) => ({ ...current, date: event.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shift-start">{t('simulation.forms.start')}</Label>
                <Input
                  id="shift-start"
                  type="time"
                  value={shift.start}
                  onChange={(event) => setShift((current) => ({ ...current, start: event.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shift-end">{t('simulation.forms.end')}</Label>
                <Input
                  id="shift-end"
                  type="time"
                  value={shift.end}
                  onChange={(event) => setShift((current) => ({ ...current, end: event.target.value }))}
                />
              </div>
            </div>
            <FieldError id="shift-error">{error ?? undefined}</FieldError>
            <Button type="submit" className="self-start">
              <Plus aria-hidden="true" />
              {t('simulation.forms.addChange')}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="removeCommitment">
          <form onSubmit={submitRemove} className="flex flex-col gap-3" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="remove-commitment">{t('simulation.forms.commitment')}</Label>
              <Select
                id="remove-commitment"
                value={removeId}
                onChange={setRemoveId}
                options={[
                  { value: '', label: t('simulation.forms.selectCommitment') },
                  ...weekCommitments.map((commitment) => ({
                    value: commitment.id,
                    label: `${commitment.title} · ${formatDate.weekdayShort(
                      commitment.start.slice(0, 10),
                    )} ${formatDate.time(commitment.start)}`,
                  })),
                ]}
              />
              {weekCommitments.length === 0 ? (
                <p className="text-2xs text-muted-foreground">{t('simulation.forms.noCommitments')}</p>
              ) : null}
            </div>
            <FieldError id="remove-error">{error ?? undefined}</FieldError>
            <Button type="submit" className="self-start" disabled={weekCommitments.length === 0}>
              <Plus aria-hidden="true" />
              {t('simulation.forms.addChange')}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="changeTask">
          <form onSubmit={submitTask} className="flex flex-col gap-3" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="change-task">{t('simulation.forms.task')}</Label>
              <Select
                id="change-task"
                value={taskId}
                onChange={setTaskId}
                options={[
                  { value: '', label: t('simulation.forms.selectTask') },
                  ...openTasks.map((task) => ({ value: task.id, label: task.title })),
                ]}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="change-deadline">{t('simulation.forms.deadline')}</Label>
                <Input
                  id="change-deadline"
                  type="datetime-local"
                  value={taskDeadline}
                  onChange={(event) => setTaskDeadline(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="change-duration">{t('simulation.forms.duration')}</Label>
                <Input
                  id="change-duration"
                  type="number"
                  min={0}
                  step={30}
                  value={taskDuration}
                  onChange={(event) => setTaskDuration(event.target.value)}
                  placeholder="120"
                />
              </div>
            </div>
            <FieldError id="task-change-error">{error ?? undefined}</FieldError>
            <Button type="submit" className="self-start" disabled={openTasks.length === 0}>
              <Plus aria-hidden="true" />
              {t('simulation.forms.addChange')}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="addRest">
          <form onSubmit={submitRest} className="flex flex-col gap-3" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rest-title">{t('simulation.forms.restTitle')}</Label>
              <Input
                id="rest-title"
                value={rest.title}
                onChange={(event) => setRest((current) => ({ ...current, title: event.target.value }))}
                placeholder={t('simulation.forms.restTitlePlaceholder')}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rest-date">{t('simulation.forms.date')}</Label>
                <Input
                  id="rest-date"
                  type="date"
                  value={rest.date}
                  onChange={(event) => setRest((current) => ({ ...current, date: event.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rest-start">{t('simulation.forms.start')}</Label>
                <Input
                  id="rest-start"
                  type="time"
                  value={rest.start}
                  onChange={(event) => setRest((current) => ({ ...current, start: event.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rest-end">{t('simulation.forms.end')}</Label>
                <Input
                  id="rest-end"
                  type="time"
                  value={rest.end}
                  onChange={(event) => setRest((current) => ({ ...current, end: event.target.value }))}
                />
              </div>
            </div>
            <FieldError id="rest-error">{error ?? undefined}</FieldError>
            <Button type="submit" className="self-start">
              <Plus aria-hidden="true" />
              {t('simulation.forms.addChange')}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="studyWindow">
          <form onSubmit={submitWindow} className="flex flex-col gap-3" noValidate>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="window-start">{t('simulation.forms.studyStart')}</Label>
                <Input
                  id="window-start"
                  type="time"
                  value={window.start}
                  onChange={(event) => setWindow((current) => ({ ...current, start: event.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="window-end">{t('simulation.forms.studyEnd')}</Label>
                <Input
                  id="window-end"
                  type="time"
                  value={window.end}
                  onChange={(event) => setWindow((current) => ({ ...current, end: event.target.value }))}
                />
              </div>
            </div>
            <FieldError id="window-error">{error ?? undefined}</FieldError>
            <Button type="submit" className="self-start">
              <Plus aria-hidden="true" />
              {t('simulation.forms.addChange')}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="screenTime">
          <form onSubmit={submitScreen} className="flex flex-col gap-3" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="screen-reduction">{t('simulation.forms.reduction')}</Label>
              <Input
                id="screen-reduction"
                type="number"
                min={30}
                max={1440}
                step={30}
                value={screen.minutes}
                onChange={(event) => setScreen((current) => ({ ...current, minutes: event.target.value }))}
              />
              <p className="text-2xs leading-relaxed text-muted-foreground">
                {t('simulation.forms.reductionHint')}
              </p>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">{t('simulation.forms.allocate')}</p>
                <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
                  {t('simulation.forms.allocateHint')}
                </p>
              </div>
              <Switch
                checked={screen.allocate}
                onCheckedChange={(checked) => setScreen((current) => ({ ...current, allocate: checked }))}
                aria-label={t('simulation.forms.allocate')}
              />
            </div>
            <FieldError id="screen-error">{error ?? undefined}</FieldError>
            <Button type="submit" className="self-start">
              <Plus aria-hidden="true" />
              {t('simulation.forms.addChange')}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </section>
  );
}
