import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { addDays, addMonths, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '@/hooks/use-formatters';
import { toDateKey } from '@/lib/date';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  id?: string;
  /** yyyy-MM-dd in local time, or an empty string. */
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}

/**
 * Parses a yyyy-MM-dd key as a *local* calendar day. Never goes through
 * `Date.parse("2026-11-09")`, which is UTC and shifts the day in timezones
 * behind UTC.
 */
function parseKey(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Calendar date picker with real keyboard navigation.
 *
 * The panel expands inline rather than floating in a portal: a portalled panel
 * inside a modal dialog is treated as an outside click (dismissing the form),
 * and a floating panel can be clipped by the dialog's scroll container.
 */
export function DatePicker({ id, value, onChange, invalid, describedBy, className }: DatePickerProps) {
  const { t } = useTranslation();
  const format = useFormatters();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(parseKey(value) ?? new Date()));
  const [focusedKey, setFocusedKey] = useState<string>(() => value || toDateKey(new Date()));
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  const selectedDate = useMemo(() => parseKey(value), [value]);
  const todayKey = toDateKey(new Date());

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const openPanel = useCallback(() => {
    const anchor = parseKey(value) ?? new Date();
    setViewMonth(startOfMonth(anchor));
    setFocusedKey(value || toDateKey(anchor));
    setOpen(true);
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const target = panelRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusedKey}"]`);
    target?.focus();
  }, [open, focusedKey, viewMonth]);

  const chooseDay = (key: string) => {
    onChange(key);
    close();
  };

  const moveFocus = (days: number) => {
    const current = parseKey(focusedKey) ?? new Date();
    const next = addDays(current, days);
    setFocusedKey(toDateKey(next));
    if (!isSameMonth(next, viewMonth)) setViewMonth(startOfMonth(next));
  };

  const shiftMonth = (delta: number) => {
    const next = addMonths(viewMonth, delta);
    setViewMonth(next);
    const current = parseKey(focusedKey) ?? new Date();
    const day = Math.min(current.getDate(), 28);
    setFocusedKey(toDateKey(new Date(next.getFullYear(), next.getMonth(), day)));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        moveFocus(-1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        moveFocus(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(-7);
        break;
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(7);
        break;
      case 'PageUp':
        event.preventDefault();
        shiftMonth(-1);
        break;
      case 'PageDown':
        event.preventDefault();
        shiftMonth(1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        chooseDay(focusedKey);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
      default:
        break;
    }
  };

  const gridStart = startOfWeek(viewMonth, { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    format.weekdayShort(toDateKey(addDays(gridStart, index))),
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) openPanel();
          }
        }}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-left text-sm text-foreground transition-colors hover:border-muted-foreground/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
          invalid && 'border-critical',
          !value && 'text-muted-foreground',
          className,
        )}
      >
        <span className="truncate tabular-nums">
          {selectedDate ? format.date(selectedDate, 'd MMM yyyy') : t('common.chooseDate')}
        </span>
        <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          data-testid="calendar-panel"
          role="dialog"
          aria-label={t('planner.taskDialog.deadlineLabel')}
          onKeyDown={handleKeyDown}
          className="absolute left-0 top-[calc(100%+0.25rem)] z-20 w-[300px] max-w-[calc(100vw-3rem)] rounded-lg border border-border bg-card p-3 shadow-lg animate-fade-in focus:outline-none"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              data-testid="calendar-prev"
              onClick={() => shiftMonth(-1)}
              aria-label={t('common.previousMonth')}
              className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <p className="text-xs font-medium tabular-nums text-foreground">
              {format.date(viewMonth, 'MMMM yyyy')}
            </p>
            <button
              type="button"
              data-testid="calendar-next"
              onClick={() => shiftMonth(1)}
              aria-label={t('common.nextMonth')}
              className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {weekdayLabels.map((label, index) => (
              <span
                key={`${label}-${index}`}
                aria-hidden="true"
                className="flex h-7 items-center justify-center text-2xs uppercase tracking-wide text-muted-foreground"
              >
                {label}
              </span>
            ))}
            {days.map((day) => {
              const key = toDateKey(day);
              const isSelected = key === value;
              const outside = !isSameMonth(day, viewMonth);
              return (
                <button
                  key={key}
                  type="button"
                  data-day={key}
                  tabIndex={key === focusedKey ? 0 : -1}
                  onClick={() => chooseDay(key)}
                  onFocus={() => setFocusedKey(key)}
                  aria-pressed={isSelected}
                  aria-current={key === todayKey ? 'date' : undefined}
                  aria-label={format.date(`${key}T12:00:00`, 'EEEE d MMMM yyyy')}
                  className={cn(
                    'h-8 rounded-sm text-xs tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                    outside ? 'text-muted-foreground' : 'text-foreground',
                    isSelected ? 'bg-primary text-background' : 'hover:bg-muted',
                    !isSelected && key === todayKey && 'border border-primary/40',
                  )}
                >
                  {format.date(`${key}T12:00:00`, 'd')}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
