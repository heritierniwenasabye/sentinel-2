# SENTINEL 2.0 — Architecture

SENTINEL is a client-side React application. Every number it displays is computed from records the
student entered; there is no server, no account, no AI prediction and no external API.

```
Browser
  React pages ── useApp() ── AppData (in memory)
       │            │
       │            └── localStorage envelope { schema, savedAt, data }
       │
       ├── scheduling engine (pure, deterministic)
       ├── simulation engine (pure, immutable)
       └── analytics (pure: workload pressure, habits, insights)
```

## Stack

React 18 · TypeScript (strict) · Vite 8 · Tailwind 3 · Radix UI primitives · Recharts ·
date-fns · i18next · Vitest 5 + React Testing Library.

There is no state library: a single context (`src/hooks/use-app.tsx`) owns the `AppData` object and
persists it on every change. Derived data (schedule, pressure score, habit totals) is computed with
`useMemo` from that object, so the interface can never drift from storage.

## Domain model (`src/types/index.ts`)

| Entity | Purpose | Key fields |
| --- | --- | --- |
| `Course` | Groups assignments, carries a colour and optional semester | `id`, `name`, `code`, `color`, `instructor`, `semesterStart`, `semesterEnd`, `archived` |
| `Task` | A piece of coursework | `courseId`, `course` (display snapshot), `deadline`, `estimatedMinutes`, `completedMinutes`, `priority`, `completed` |
| `Commitment` | Fixed time study must work around | `start`, `end`, `category`, `recurrence`, `weekdays`, `recurrenceUntil`, `exceptions` |
| `CommitmentOccurrence` | A series expanded onto one date | `occurrenceId`, `dateKey`, `isRecurring` |
| `UsageGoal` | Daily per-app limit based on manual entries | `id`, `app`, `dailyLimitMinutes` |
| `DigitalUsageEntry` | Self-reported screen time | `app`, `date`, `minutes`, `category` |
| `UserPreferences` | Planning rules and interface state | study window, daily cap, break, sleep, theme, language, onboarding flag |

Assignments reference courses by `courseId`. The `course` string is kept as a display snapshot so a
deleted course cannot orphan a task, and so legacy data remains readable.

All datetimes are stored as **local** ISO strings without a timezone suffix (`toLocalIso`), and
calendar days as `yyyy-MM-dd` keys built from local year/month/day parts. Nothing is round-tripped
through UTC, so a selected day cannot shift by one.

## Persistence and schema migration (`src/lib/storage/storage.ts`)

- The storage key keeps its original name (`sentinel.v2.data`) so existing students keep their data.
- The envelope stores `schema: 3`; the data object also carries `version: 3`.
- `parseAppData` is the single validation gate for both localStorage and imported files. It clamps
  values, drops invalid records with an error message, de-duplicates ids, and reconciles course links.
- A schema-2 dataset (course names only) is migrated by deriving one `Course` per distinct name and
  linking the tasks; no value the student typed is changed.
- Corrupted storage returns `null`, which starts an empty (not crashed) workspace.
- `mergeAppData` implements the merge import: existing ids and course names win, imported course
  references are remapped, and the summary reports what was skipped.

## Scheduling engine (`src/lib/scheduling/engine.ts`)

Pure function `buildSchedule(input)`. Inputs are never mutated.

1. **Expansion.** Weekly commitments are expanded onto concrete dates for the planned week
   (`src/lib/recurrence.ts`), honouring `weekdays`, `recurrenceUntil` and `exceptions`.
2. **Capacity per day.** The preferred study window minus sleep and fixed commitments, cut into
   30-minute slots. Slots before `now` are not created.
3. **Daily cap.** `min(free minutes, maxDailyStudyMinutes + focus bonus)`.
4. **Ordering.** Unfinished work due inside the week, plus the following seven days, sorted by
   deadline, then priority (high → medium → low), then length.
5. **Placement.** Chronological slot filling. Never after the deadline, never past the daily cap,
   maximum 90 continuous minutes, then a break of at least `minBreakMinutes`.
6. **Reporting.** Anything that does not fit becomes an unscheduled item with a reason
   (`overdue` or `insufficient-time`). Nothing is silently dropped.
7. **Remaining time.** `estimatedMinutes − completedMinutes` is scheduled and counted as demand.

All four pages use the same engine through `useWeekSchedule`, so the planner, overview, wellness
insights and simulation cannot disagree.

**Granularity:** 30-minute slots with a shorter final remainder block; a 90-minute assignment is three consecutive slots when the calendar
allows, otherwise split across blocks or days, with any shortfall reported as unscheduled minutes.

## Simulation (`src/lib/simulation/`)

A scenario is an immutable list of operations (`add-commitment`, `remove-commitment`, `update-task`,
`study-window`, `screen-time`). `applyScenario` returns a new `AppData` plus an optional per-day
capacity bonus. `compareScenario` runs the same engine twice — baseline and simulated — and derives
every delta from the two results. Applying is a separate, confirmed step (`commitScenario`); until
then the stored data is untouched.

## Analytics

- `analytics/workload.ts` — Workload Pressure 0–100 from five normalised, published weights.
- `analytics/habits.ts` — totals, per-recorded-day average, discretionary cap for reductions.
- `analytics/insights.ts` — observations generated from computed values, never templates.

## Interface layer

- `pages/` — one route per workspace area.
- `components/planner/` — task, commitment and course dialogs, the week calendar, lists, conflicts.
- `components/ui/` — accessible primitives, including the custom `Select` (combobox + listbox) and
  `DatePicker` (calendar grid). Both expand **inline** rather than in a portal: a portalled panel is
  treated by a modal dialog as an outside click, and inline panels cannot be clipped by scrolling.
- `components/onboarding/` — skippable five-step first-run setup.
- `components/insights/wellness-dimensions.tsx` — Maryville wellness dimensions wired to real metrics.
- `components/settings/data-manager.tsx` — JSON preview (merge/replace) and CSV import/export.

## Internationalisation and theming

Five locales (`en`, `fr`, `es`, `pt`, `zh-CN`) are typed against the English dictionary, so a missing
or extra key fails `tsc`. Dates and numbers use date-fns locales and `Intl`. Theme is `light`, `dark`
or `system`; the `dark` class is applied to `<html>` and follows `prefers-color-scheme` in system mode.
Switching either never touches stored records.

## Accessibility

Labelled controls, `aria-invalid` plus described errors, visible focus rings, Radix dialogs with focus
traps, `role="combobox"`/`listbox` with full keyboard support, a calendar grid with arrow/PageUp/PageDown
navigation, `aria-live` status messages, chart alternatives, and `prefers-reduced-motion` support.

## Testing

Vitest 5 + React Testing Library cover the engine, recurrence expansion, simulation isolation, storage
validation and migration, import/export formats, habit maths, translation parity and the real task
form (priority, calendar, persistence, scheduling). See `README.md` for the current passing counts.

## Deliberate trade-offs

- Chronological fill, not an optimiser: it favours deadline safety and explainability over minimum
  context switching.
- Recurrence is weekly only; monthly/yearly rules and iCalendar are out of scope for the MVP.
- Recovered screen time changes capacity only when the student explicitly opts in; it is never
  silently converted into study minutes.
- One browser profile is the storage boundary; JSON export is the manual sync path.

## Release hardening additions

The schema-3 `usageGoals` array is optional for legacy imports and present in current exports. Local
corrupt/partially invalid payloads are preserved byte-for-byte; Settings can download and validate them,
then merge valid records after confirmation. If preserving the raw evidence fails, writes refuse to
overwrite the damaged primary. Upload limits apply at the import boundary (5 MiB/10,000 records).

`useClock` refreshes date-dependent views every minute and on focus/visibility return. The engine
traverses time once, carries breaks across assignment boundaries and conserves eligible remaining
demand. Local clock construction and overnight recurrence expansion protect DST windows and carry-in.
Simulation uses the latest screen reduction and never stacks it with saved capacity.

Pages are lazy-loaded behind Suspense and a non-destructive error boundary. Inter fonts are bundled
locally. Shared radio groups support arrow/Home/End selection; comparison metrics use semantic dt/dd.
Current verification is in [HARDENING_ACCEPTANCE.md](HARDENING_ACCEPTANCE.md).
