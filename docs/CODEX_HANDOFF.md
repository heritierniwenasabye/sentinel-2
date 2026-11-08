# SENTINEL 2.0 — Codex handoff

This document is the entry point for the next engineering platform. It describes where the code
lives, how it fits together, how to run it, and what should be done next. Read it together with
[`ARCHITECTURE.md`](ARCHITECTURE.md) and [`RELEASE_AUDIT.md`](RELEASE_AUDIT.md).

## Stack

- React 18 + TypeScript (strict), Vite 5, React Router 6, Tailwind CSS 3, Radix primitives,
  Recharts, date-fns, i18next/react-i18next.
- Vitest + Testing Library (jsdom).
- No backend, no database, no authentication, no network calls at runtime. The production artifact is
  a static SPA in `dist/`.
- Package manager: npm, with `package-lock.json` committed. Node 18+ recommended.

## Commands

```bash
npm ci                 # reproducible install from the lockfile
npm run dev            # Vite dev server on http://localhost:3000
npm run typecheck      # tsc --noEmit
npm run test           # vitest run (75 tests, 11 files)
npm run build          # typecheck + vite build → dist/
npm run preview        # serve dist/ locally
```

The dev server binds to localhost by default. For a cloud preview, bind to `0.0.0.0` and allow the
preview hostname (`SENTINEL_PREVIEW_HOST` is read by `vite.config.ts`); never commit that hostname.

## Request flow

`src/main.tsx` mounts `App` inside `AppProvider` (data) and `ToastProvider`. `src/App.tsx` defines the
router: `/` overview, `/planner`, `/simulation`, `/habits`, `/insights`, `/settings`, plus a catch-all
not-found page. `AppShell` renders the sidebar/header and the first-run onboarding dialog. There is no
server state; every page reads the same in-memory dataset from `useApp()` and renders derived values
from pure functions.

```
localStorage (sentinel.v2.data)
        │  loadAppData / saveAppData (src/lib/storage/storage.ts)
        ▼
AppProvider (src/hooks/use-app.tsx)  ── persists every mutation
        │
        ├── useWeekSchedule → buildSchedule (src/lib/scheduling/engine.ts)
        ├── analytics (src/lib/analytics/*)
        ├── Simulation (src/lib/simulation/*)
        └── pages / components
```

## Key files

| Concern | Location |
| --- | --- |
| Domain types | `src/types/index.ts` (+ `src/types/*`) |
| Storage, validation, migration, demo | `src/lib/storage/storage.ts`, `demo.ts` |
| Preferences and defaults | `src/lib/preferences.ts` |
| Scheduling engine | `src/lib/scheduling/engine.ts` |
| Recurrence expansion | `src/lib/recurrence.ts` |
| Date/slot helpers | `src/lib/date.ts` |
| Simulation engine / scenario ops | `src/lib/simulation/engine.ts`, `scenario.ts` |
| Workload pressure / habits / insights | `src/lib/analytics/*` |
| CSV parse/validate/export | `src/lib/io/csv.ts` |
| App store and persistence | `src/hooks/use-app.tsx` |
| Schedule hook | `src/hooks/use-schedule.ts` |
| Pages | `src/pages/*` |
| Planner UI (calendar, dialogs, lists) | `src/components/planner/*` |
| Onboarding | `src/components/onboarding/*` |
| Data manager (JSON/CSV/demo/wipe) | `src/components/settings/*` |
| Locales | `src/locales/{en,fr,es,pt,zh-CN}.ts` |
| Tests | `src/tests/*` |

## Persistence architecture

- One versioned envelope in `localStorage` under `sentinel.v2.data`:
  `{ schema, savedAt, data: { version, courses, tasks, commitments, usage, preferences, demoLoaded } }`.
- `loadAppData` validates field-by-field and migrates older shapes (v2 → v3 derives courses from task
  names). It never overwrites an unreadable payload: the raw string is copied to
  `sentinel.v2.data.corrupt` before an empty dataset is returned.
- `AppProvider` holds the dataset in React state. Each mutation produces a new immutable dataset and
  is written through `saveAppData` in an effect. There is no debounce; the payload is small.
- `updatePreferences` normalises values (study window, caps, theme, language). Loading demo data
  preserves the current theme/language.
- Import goes through `parseAppData`/`mergeAppData` or the CSV validators before anything is written;
  replace mode is confirmed in the UI.
- If `localStorage` is unavailable or a write throws, the app keeps working in memory and the UI warns
  that changes will not persist.

## Scheduling engine

`buildSchedule({ tasks, commitments, preferences, weekStart, now })` returns
`{ blocks, unscheduled, conflicts, totals, infeasible }` and is a pure function.

- Expands weekly commitments into `CommitmentOccurrence[]` (`expandCommitments`), including exceptions
  and end dates.
- Builds 30-minute slots inside each day's study window, excluding sleep and commitments, never in the
  past, capped by `maxDailyStudyMinutes` (+ recovered focus bonus).
- Includes unfinished work due within the week and the next `SCHEDULING_LOOKAHEAD_DAYS` (7) days,
  ordered by deadline, then priority, then length.
- Schedules `estimatedMinutes − completedMinutes`; never crosses a deadline, caps continuous study at
  90 minutes and inserts the configured break.
- Reports every remainder in `unscheduled` with `overdue` or `insufficient-time`; never drops work.
- Conflict ids combine the two occurrence ids, so the same series pair on different days cannot collide.

`useWeekSchedule` memoises this for the displayed week. Overview, Planner, Insights and Simulation all
call the same engine, so their numbers cannot drift.

## Simulation engine

`src/lib/simulation/engine.ts` exposes `compareScenario` and `applyScenario`; `scenario.ts` defines the
operation list and produces pending-change descriptions. `compareScenario` runs `buildSchedule` on the
baseline and on an immutable simulated copy, then diffs totals/blocks/pressure. `applyScenario` returns a
new dataset and an optional per-day focus bonus; only the confirmed "Apply" path persists it. Screen-time
reductions are capped by recorded discretionary minutes and rounded down to 30-minute blocks.

## Tests

`src/tests/` holds 75 tests across 11 files:

- `scheduling.test.ts` — ordering, priority tie-breaks, look-ahead, non-overlap, deadline safety,
  infeasible reporting, conflicts (including unique ids across days), daily caps, completed work.
- `recurrence.test.ts` — weekdays, exceptions, end dates, overnight/one-off handling.
- `priority-deadline.test.tsx`, `task-workflow.test.tsx` — real dialogs, keyboard listbox/calendar,
  persistence, recalculation, simulation sync.
- `course-manager.test.tsx` — create/edit/archive/delete-with-keep.
- `storage.test.ts` — migration, merge/replace, corrupt-payload backup, duplicate handling.
- `csv.test.ts` — quoting, validation, templates.
- `simulation.test.ts` — immutability, capping, commit.
- `habits.test.ts`, `pressure.test.ts`, `i18n.test.ts` — totals, bounds, key parity.
- `assignment-lifecycle.test.tsx` — completing removes blocks, reopening restores, partial minutes
  schedule only the remainder.

Layout was additionally measured at 320/375/768/1024/1440 px in Chromium with real app routes (all 30
combinations had `scrollWidth === clientWidth`). No Playwright suite is committed because the build
environment could not run it.

## Conventions and constraints

- Keep the engine pure and deterministic; all pages must keep using `useWeekSchedule`.
- Preserve the storage key and schema migrations; never discard a user's payload.
- Every new UI string needs all five locale dictionaries; `i18n.test.ts` and the typed dictionary enforce
  parity.
- Do not introduce cloud sync, accounts, analytics, or device-usage access without an explicit product
  decision; the "local-only, no account" promise is part of the design.
- Use existing UI primitives (`src/components/ui/*`) and the `SectionCard` layout wrapper; do not add a
  second design system.
- The app must remain usable at 320 px without page-level horizontal overflow.

## Remaining prioritized engineering tasks

**P1**

1. Add an end-to-end suite (Playwright) for the first-run journey, planner recalculation, simulation
   apply, and JSON/CSV import. The environment used for this audit could not run Playwright, so those
   flows are covered by unit/integration tests and manual browser passes only.
2. Expose recovery for `sentinel.v2.data.corrupt` in Settings (download or restore the raw payload), so
   the backup added in this audit is reachable without devtools.

**P2**

3. Replace the remaining native `datetime-local` inputs (commitment dialog, simulation builder, habits
   entry) with the accessible custom date/time controls for consistent behaviour across browsers.
4. Fix the Simulation Lab scenario tab strip clipping at ~432 px (it scrolls horizontally; make it wrap or
   show a scroll affordance).
5. Address `npm audit`'s two moderate `react-router` advisories by planning a v7 upgrade (breaking) and
   re-running the full suite; do not force-upgrade without testing.
6. Native-speaker review of fr/es/pt/zh-CN copy, especially scheduling terminology.
7. Optional: import/export `.ics`, monthly recurrence, drag-to-reschedule generated blocks.
