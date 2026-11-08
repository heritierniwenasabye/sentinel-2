# SENTINEL 2.0 — Release candidate audit

> Historical evidence. The current release-hardening results are in [HARDENING_ACCEPTANCE.md](HARDENING_ACCEPTANCE.md).


> Historical report from the starting commit. See [INDEPENDENT_AUDIT.md](INDEPENDENT_AUDIT.md) for the independent follow-up, reproduced defects, fixes and current results.

Date: 8 November 2026 · Scope: final independent QA/release pass before GitHub transfer.

## Verdict

The application is a working, self-contained SPA. No P0 defects were found after fixes. Three P1
defects were found and fixed during this audit (one data-loss risk, one scheduling-identity bug, one
responsive overflow). Typecheck, 75 automated tests and the production build all pass. Remaining issues
are P2 and are listed in [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md).

Nothing was deployed, published, pushed or force-pushed. No dependency versions were changed.

## Method

| Layer | What was done |
| --- | --- |
| Source inspection | Read every page, engine, storage, IO, simulation and UI primitive involved in the flows; searched for `TODO`, placeholders, `dangerouslySetInnerHTML`, `eval`, `innerHTML`, `__proto__` and committed secrets. |
| Automated tests | `npm run typecheck`, `npx vitest run` (jsdom + Testing Library), `npm run build`. |
| Real browser | Chromium via the cloud preview at a 432 px CSS viewport, against the Vite dev server on the real routes, with `localStorage` cleared first. DOM/localStorage assertions plus rendered text. |
| Layout measurement | A temporary same-origin harness (since removed) loaded the real routes in iframes at 320, 375, 768, 1024 and 1440 px and compared `documentElement.scrollWidth` with `clientWidth` for all 30 combinations. |
| Supply chain | `npm audit --omit=dev`. |

Playwright could not run in this environment (`options.mode must be one of: 'strip'`), so there is no
committed E2E suite and browser checks were scripted through the preview's evaluation channel rather
than OS-level input. This limitation is stated wherever it affects a claim.

## Inventory

- Entry: `index.html` → `src/main.tsx` → `src/App.tsx` (React Router). Six routes: `/`, `/planner`,
  `/simulation`, `/habits`, `/insights`, `/settings`, plus a not-found page.
- Domain: courses, assignments (`Task`), commitments (one-off/weekly series with exceptions), screen-time
  `UsageEntry`, preferences.
- Pure engines: `src/lib/scheduling/engine.ts`, `src/lib/recurrence.ts`, `src/lib/simulation/*`,
  `src/lib/analytics/*`, `src/lib/io/csv.ts`.
- Persistence: versioned `localStorage` envelope (`sentinel.v2.data`), validation, v2→v3 migration,
  JSON/CSV import, demo loader.
- UI: shared primitives in `src/components/ui`, Radix dialogs/tabs, custom accessible listbox and
  calendar, Recharts charts, five locale dictionaries.
- No placeholder components, hardcoded dashboard metrics, mock calculations, disconnected controls or
  unfinished `TODO`s were found. All metrics read from the dataset through the same engine.

## First-time user journey (clean storage)

Performed in the real browser after `localStorage.clear()` and a reload.

| Step | Result |
| --- | --- |
| 1–2. New user, no fictional data | Pass — onboarding shown; no courses, assignments or Alex Morgan data present. |
| 3. Skip onboarding | Pass — "Skip setup" closes the wizard; empty Overview offers real actions. |
| 4–10. Add course, edit it, add assignment, Medium→High, calendar deadline, 90 min | Pass — course/assignment dialogs are the real components. Assignment persisted with `priority: "high"`, `estimatedMinutes: 90`, `deadline: 2026-11-09T23:59`. |
| 11–12. Assignment list and Upcoming Deadlines | Pass — Overview reported "1 h 30 min planned" and 1 deadline within seven days. |
| 13–14. Scheduler calculates and calendar shows blocks | Pass — Planner header "1 of 1 assignments scheduled"; block rendered "Security Case Study · 09:00–10:30" (90 min at 0.8 px/min). |
| 15–16. Add class commitment, scheduler avoids it | Pass — added "Campus café shift", Mon 9 Nov 09:00–17:00. The only study block is **Sun 8 Nov** 09:00–10:30 (day column 7 of Mon 2 – Sun 8), and the class window contains no block, so no overlap is produced. |
| 17–18. Edit deadline recalculation | Engine tests assert deadline ordering moves blocks to different days (`scheduling.test.ts`), and `task-workflow.test.tsx` asserts the saved deadline is honoured. A deadline **edit** was not re-played as a separate browser interaction in this pass. |
| 19–20. Complete assignment, future blocks disappear | Pass — completion checkbox set `completed: true`; header became "0 of 0 assignments scheduled" and no study block remained. |
| 21–22. Refresh persistence | Pass — after reload the task is still completed, the commitment is present, and no blocks are shown. |
| 23–25. Delete assignment, archive/delete course, no orphans | Deletion/archival semantics covered by `course-manager.test.tsx` (keep vs delete assignments) and storage validation; not re-run end-to-end in the browser this pass. |

Completed tasks are filtered to their deadline week in the Planner (by design), so a task completed
while viewing the previous week moves to the next week's list; it was reopened there and the block
returned (block list restored, Sun 8 Nov 09:00–10:30). This is documented behaviour, not a defect, but
it can look like the task vanished if the student does not change weeks.

## Scheduling edge cases

| Case | Evidence |
| --- | --- |
| Due today / overdue | Engine tests cover overdue demand and `overdue` reporting; the planner lists unscheduled work with reasons. |
| No available time / very long assignment / insufficient capacity | `scheduling.test.ts` asserts `infeasible: true`, `unscheduled` with `insufficient-time`, and exact remaining minutes (540 unscheduled in the 60-min/day case) rather than dropping work. |
| Multiple assignments same day | Deadline/priority ordering tests; no overlaps asserted after sorting all blocks. |
| Overlapping fixed commitments | Conflict detection test: 30-minute overlap reported as `commitment-overlap`. |
| Recurring classes | Recurrence tests plus an engine test where a weekly class blocks study time. |
| Overnight commitments / study crossing midnight | Occurrences are expanded per date; slots never cross the study-window end (windows must start and end the same day). No dedicated midnight study block is generated. |
| DST / timezone | Dates are local wall-clock ISO strings and slot arithmetic uses local date parts; no automated DST test exists (documented limitation). |
| Zero/invalid duration | Form validation requires a positive duration; engine treats missing demand as zero. |
| Completed assignments | New lifecycle test: no blocks, zero demand; reopening restores blocks. Partial progress schedules only the remainder. |
| Deleted assignments | Dataset removal recomputes the schedule; blocks reference task ids, so no orphan blocks are rendered. |
| Week navigation | Real browser: next/previous week changed the rendered range and exposed the completed task in its deadline week. |
| Minimum break / daily limits | Engine tests assert ≤90-minute continuous blocks, the configured break, and the daily cap. |
| Double booking | Property-style assertion in `scheduling.test.ts`: every pair of blocks is non-overlapping. |

## Simulation

- `simulation.test.ts` verifies input immutability, screen-time capping/rounding, and commit behaviour.
- `task-workflow.test.tsx` verifies the Simulation Lab recomputes from the same engine after a task
  change.
- The full interactive shift → compare → apply → reset flow was verified in the previous development
  session (4-hour shift created one conflict; pressure 53→56; baseline restored on reset) but was **not
  re-run in this browser pass**. This is an evidence gap, not a known failure.

## Personalization and data management

- Course CRUD/archive/delete-with-keep, assignment CRUD/complete/reopen, commitment CRUD, recurring
  exceptions, habits entries, settings persistence, JSON export/import with merge/replace, CSV
  import/export/templates, invalid-row reporting and demo load/reset are implemented and covered by
  `course-manager.test.tsx`, `storage.test.ts`, `csv.test.ts`, `habits.test.ts` and `simulation.test.ts`.
- This pass added corrupt-payload backup verification: an unreadable envelope is copied to
  `sentinel.v2.data.corrupt` before the app boots empty. There is still no UI to restore it (P1 follow-up,
  see `CODEX_HANDOFF.md`).
- No feature is faked: every button inspected performs a state change or opens a real control.

## Interface

**Widths.** All 30 route × width combinations reported `scrollWidth === clientWidth` after the fixes
(320, 375, 768, 1024, 1440 px). Before the fixes, Overview and Planner overflowed at 320/375 px (430 px
and 486 px content). Charts and the calendar scroll inside their own containers at phone widths.

**Themes.** Light, Dark and System are implemented through `html.dark`; switching to Dark in Settings
set `html.dark` and persisted `preferences.theme = "dark"`. Forced dark rendering and text contrast were
not audited pixel-by-pixel.

**Languages.** English, French, Spanish, Portuguese and Simplified Chinese. Switching to 简体中文 in the
real browser set `<html lang="zh-CN">`, translated the page heading to "设置", the subtitle and all six
navigation labels, with zero horizontal overflow and no missing-key fallbacks visible. Dictionary key
parity and typed dictionaries are enforced by `i18n.test.ts`/typecheck. Native-speaker review has not
happened.

**Keyboard/focus.** The custom priority listbox and deadline calendar support arrows, Home/End,
Enter/Space, Escape and tab-out (tested). Radix dialogs trap focus; destructive actions confirm. A full
screen-reader audit was not performed.

## Security and privacy

- No hardcoded credentials, API keys, tokens or `.env` files in the repository; none are tracked.
- No `dangerouslySetInnerHTML`, direct `innerHTML` writes, `eval`, `new Function`, or `__proto__`
  handling in `src/`. Imported data is parsed as JSON and validated field-by-field before merging.
- The only external requests are Google Fonts stylesheets in `index.html` (preconnect + CSS). No runtime
  API calls, analytics, telemetry or third-party scripts.
- The product claims local-only storage and no account/sync; UI copy matches the implementation.
- `npm audit --omit=dev` reports **2 moderate** advisories in `react-router` via `react-router-dom`
  (open redirect via backslash; SSR hydration constructor injection). The app uses client-side routing
  and does not deserialize SSR errors, so exposure is low, but the fix requires a breaking v7 upgrade.
  It was intentionally not applied during a release audit.
- JSON import has no size cap (P2); a very large file can block the tab before validation.

## Checks

```
npm run typecheck  → exit 0
npx vitest run     → 11 files, 75 tests passed, exit 0
npm run build      → exit 0
  index   525.63 kB (152.36 kB gzip)
  charts  385.04 kB (106.21 kB gzip)
  react   156.08 kB (51.10 kB gzip)
  intl     83.50 kB (25.81 kB gzip)
  css      31.86 kB (6.74 kB gzip)
```

`npm audit --omit=dev` → 2 moderate (react-router). No Playwright/E2E run was possible.

## Defects found and fixed

| Severity | Defect | Fix |
| --- | --- | --- |
| P1 (data loss) | An unreadable/corrupt `sentinel.v2.data` payload was replaced by an empty dataset on next save, destroying the user's only copy. | `loadAppData` copies the raw payload to `sentinel.v2.data.corrupt` before returning defaults; regression test added in `storage.test.ts`. |
| P1 (scheduling) | Conflict ids were built from the series pair, so the same two weekly commitments overlapping on different days produced duplicate ids. | `detectConflicts` now receives `CommitmentOccurrence[]` and ids include both occurrence ids; regression test covers two weekly series. |
| P1 (layout) | Overview and Planner overflowed horizontally at 320/375 px (430/486 px content). | `min-w-0` on the grid/flex children and scroll containers in `section-card.tsx`, `week-calendar.tsx`, `overview.tsx`, `planner.tsx`; measured 0 overflow across all 30 combinations. |

## Remaining issues

**P1**

- No committed end-to-end suite; Playwright cannot run in this environment. The first-run journey and
  simulation apply flow therefore rely on jsdom integration tests, this browser pass, and prior manual
  passes rather than repeatable E2E.
- The corrupt-payload backup has no restore/download UI.

**P2**

- Two moderate `react-router` advisories; upgrade path is a breaking v7 migration.
- Remaining native `datetime-local` inputs (commitment, simulation builder, habits) versus the custom
  accessible controls elsewhere.
- Simulation Lab scenario tab strip clips at ~432 px (scrollable, no affordance).
- French/Spanish/Portuguese/Chinese copy not reviewed by native speakers.
- No `.ics` import/export, monthly recurrence, or drag-to-reschedule.

No known P0 issue remains. The release is suitable for a GitHub handoff and demo, with the P1 evidence
gap above stated honestly.
