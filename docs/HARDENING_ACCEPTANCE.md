# SENTINEL 2.0 — Release hardening acceptance

> This records the engineering hardening gate at `cdba8ff`. See [PRODUCT_POLISH.md](PRODUCT_POLISH.md) for the subsequent product/demo review and latest regression totals.


Date: 7 November 2026 America/Chicago (8 November UTC in executor logs).
Repository: `heritierniwenasabye/sentinel-2` · PR #1 · branch `audit/independent-release-review`.
Hardening baseline: `8a3bb260a622278cbb6b1b0e5b8da4b8e29a0b91`; original release baseline: `98d72ca`.
This report supersedes the earlier audit's current-defect and test-count statements.

## Decision

**PASS — local production-build acceptance.** No known P0/P1 functional defect remains in the
supported workflows exercised below. All required local automated checks pass; no critical journey
failed in the final run. This is scoped engineering evidence, not a guarantee of defect absence in
untested browsers, all possible inputs or assistive technologies.

**BLOCKED — hosted deployment verification and release authorization.** No deployed preview URL
was provided or found in repository documentation or commit statuses (the starting PR commit had no
statuses). The owner has not approved deployment or merge. Neither was performed. The static artifact
is ready for a separately approved preview/deployment check; production release remains withheld.

Classifications: **PASS** = independently verified with the stated evidence; **FAIL** = reproducible
remaining defect; **BLOCKED** = unsupported or not verifiable in this pass. No current FAIL is hidden
as a PASS. Unsupported capabilities are explicitly separated below.

## Evidence and reproducibility

Node 24.22.1, Chromium via `/usr/bin/chromium`, actual local production bundle on `vite preview`
port 3010. New profiles start empty. Browser tests freeze the student clock to Monday 2 November
2026 08:00 America/Chicago; these are labelled test records, not real student data.

| Required check | Classification | Observed result |
| --- | --- | --- |
| Clean `npm ci` | PASS | Lockfile install completed; no force or ignored peer dependencies |
| `npm run typecheck` | PASS | Includes app, unit tests, Playwright tests and configuration |
| `TZ=UTC npm test` | PASS | **136 tests, 13 files** |
| `TZ=America/Chicago npm test` | PASS | **136 tests, 13 files** |
| `TZ=Asia/Kathmandu npx vitest run src/tests/hardening.test.ts src/tests/release-regressions.test.ts` | PASS | **60 tests, 2 files**, fractional-offset timezone |
| `npm run build` | PASS | Vite 8 production artifact; no large-chunk warning |
| `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --reporter=line` | PASS | **17 tests**, final run **1.5 minutes**, no retries |
| Six routes × 320/375/768/1024/1440 px | PASS | **30 combinations**, no page-level horizontal overflow |
| Browser runtime + console-error fixture | PASS | All 17 tests assert no page errors or console errors |
| axe WCAG 2 A/AA and 2.1 AA scans | PASS | All six demo-populated routes in both light and dark, plus goal dialog; final scans have no violations in these scopes |
| `npm audit --omit=dev` | PASS | 0 reported vulnerabilities |
| Full `npm audit` | PASS | 0 reported vulnerabilities, including development dependencies |
| `git diff --check` | PASS | Clean |
| Deployed host behavior / provider rewrite | BLOCKED | No deployed URL; local production route refreshes pass |

Run `npm run preview -- --port 3010` before the production browser command. Standard
`npm run test:e2e` can start the loopback development server instead. Install a browser once with
`npx playwright install chromium`, or set `CHROMIUM_PATH` to a system browser.

## Feature acceptance matrix

Evidence names below refer to committed tests, not assumptions from source inspection. `student`
means `e2e/student.spec.ts`; `hardening-browser` means `e2e/hardening.spec.ts`; `unit` means the named
`src/tests/` file. PASS applies to the described interactions; it does not imply every permutation
of every field was exhaustively tested.

| Feature / interactive surface | Status | Evidence and state checks |
| --- | --- | --- |
| Empty initial workspace and local-data disclosure | PASS | student first-use test; zero courses/tasks; no injected fiction |
| Full onboarding: name, planning hours/limits, theme step, first course/task, finish | PASS | hardening-browser complete mobile journey; persisted result |
| Skip onboarding | PASS | all other browser setups; empty workspace retained |
| Onboarding validation/back/appearance/locale controls | PASS | hardening-browser onboarding drill exercises back, invalid fields, locale and theme selection, colour, finish and malformed-data recovery; not an exhaustive step-state cross-product |
| Overview new-task action, generated metrics, planner link | PASS | hardening-browser course/details test; actual created task and planner row |
| Overview demo loading and settings demo/reset | PASS | student demo confirmations and actual dataset counts |
| Planner Plan/Courses tabs and previous/next/This week navigation | PASS | student lifecycle and hardening-browser details tests |
| Course create, edit, code, instructor, colour, semester calendars, details disclosure | PASS | hardening-browser course/details test; student lifecycle; course-manager unit tests |
| Course archive/restore | PASS | student and complete mobile journey; archived flag and restore action |
| Course delete: keep/unlink, relink, or delete assignments | PASS | student lifecycle; exact course/task counts and no dangling courseId |
| Task create/edit, title, course, description control, duration, progress, priority | PASS | student lifecycle; task-workflow/form-controls unit; complete mobile journey |
| Priority keyboard and calendar arrows/month controls | PASS | form-controls unit plus hardening-browser keyboard test and student next-month deadline edit |
| Deadline edit/recalculation, future-horizon display | PASS | student later-work test; remains unfinished, no current-week block |
| Task complete/reopen/delete and persistence | PASS | student lifecycle/deletion plus assignment-lifecycle unit |
| Generated study block opens its task; no overlap/deadline overflow | PASS | hardening-browser clicks the generated block and saves a task description; engine invariants validate calculations |
| Class/work/personal commitments, title/time/category edits and delete/cancel | PASS | student commitments and full mobile journey |
| Weekly recurrence, original series anchor, occurrence detach/exception | PASS | student commitments test; recurrence + hardening unit |
| Occurrence versus series deletion | PASS | student deadline/recurring-deletion test |
| Recurrence weekdays/until/overnight rules | PASS | courses-recurrence and hardening unit; browser weekly editor paths |
| Conflict detection and displayed explanation | PASS | student overlapping lecture/shift and scheduling unit |
| Habit entry create/edit/delete/date/category and persistence | PASS | student CRUD and full mobile journey; invalid dates covered in hardening unit |
| Habit category filter | PASS | hardening-browser header/filter test selects Education and sees the empty filtered state |
| Habit totals, recorded-day average, rolling week, per-app/category progress | PASS | analytics unit and demo routes; no hardcoded result substituted |
| Per-app goal create/edit/delete/cancel/validation | PASS | hardening-browser goal test and complete mobile journey |
| Goal progress, unknown data, limits, JSON persistence | PASS | hardening unit plus browser empty-day, over-limit and reload assertions |
| Habit reduction input, cap, allocation switch and saved capacity | PASS | analytics unit; hardening-browser focus save/disable/reload test |
| Simulation shift/removal/task/rest/window/reduction tabs and controls | PASS | hardening-browser combined-scenario test exercises every type |
| Scenario baseline isolation, calculated comparisons, pending changes | PASS | immutable combined-scenario unit assertions and browser storage equality before commit |
| Reset, apply cancellation, confirm/apply/reload | PASS | student simulation; complete mobile journey; combined-scenario browser test |
| Saved-focus override and repeated reductions | PASS | hardening unit: latest reduction wins, no double counting, commit matches hypothetical totals |
| Planning preferences validation/save | PASS | hardening-browser invalid-window/save and mobile journey; preference unit |
| Header language/appearance menus | PASS | hardening-browser mobile header controls |
| Settings five locales, three themes, system media changes | PASS | student and hardening-browser menu/radio tests |
| Radio keyboard arrows, native button selection and modal Escape/focus | PASS | hardening-browser tests plus shared form-control unit |
| JSON download/merge/replace/cancel and actual file restore | PASS | student imports; complete mobile journey downloads actual bytes, clears, restores and compares full data after reload |
| CSV course/task/commitment import/export and templates | PASS | student round trips, hardening-browser template downloads and csv unit tests |
| Import bad dates/IDs/durations/links/duplicates, format/size/count errors | PASS | hardening unit; browser malformed JSON/oversize CSV; localized preview before confirmation |
| Recovery discovery, raw byte download, validation, cancel/merge/reload | PASS | hardening-browser recovery test; damaged original bytes retained |
| Corrupt/partial data, previous backup and backup-quota protection | PASS | hardening unit: never overwrite damaged primary when backup fails; previous evidence retained |
| Failed writes, export of unsaved memory, reload to last saved state | PASS | hardening-browser quota test and denied read/write unit tests |
| Insights formula, chart alternatives and wellness links | PASS | pressure/analytics unit; axe route scan; hardening-browser follows all four wellness links |
| Lazy route navigation and direct refresh | PASS | production browser suite and 30 layout checks |
| Live schedule refresh | PASS | hardening-browser advances clock three hours without edit/reload; prior block disappears, future valid block appears |
| Mobile full journey / dialogs | PASS | 375 px complete journey; separate 320–1440 route checks |
| Missing keys/interpolation/static UI key references | PASS | i18n unit checks all five dictionaries and static t() keys |
| Native-speaker translation quality | BLOCKED | No native-speaker review; no certification claimed |
| Screen-reader, Safari and Firefox certification | BLOCKED | Not performed; keyboard/axe evidence is not substituted for these checks |
| iCal, monthly/yearly recurrence, external calendars, drag-rescheduling | BLOCKED | Unsupported by design and labelled accordingly, not advertised as working |
| Hosted preview and production deployment | BLOCKED | No URL and no owner deployment approval; no deployment performed |

## Realistic student journey

The dedicated **375 px** browser test completes onboarding, adds three courses and six assignments
with varied priorities/durations/deadlines, creates two recurring classes/two shifts/personal time,
edits a deadline and priority, records partial minutes, completes/reopens work, archives/restores and
edits course information, edits/removes commitments, previews/cancels/resets/applies a shift, logs and
edits usage, creates an over-limit goal, saves study preferences, switches all five languages and all
three themes, downloads real JSON, clears after confirmation, restores that actual file and verifies
full dataset equality after reload. Course destructive-delete choices are independently covered in
student lifecycle tests; no unsupported “undelete” is implied.

## Defects reproduced and fixed in this hardening pass

| Finding | Resolution / regression evidence |
| --- | --- |
| Fifteen-minute remaining demand could not be scheduled | Short final blocks conserve exact demand; regression updated to assert a real 15-minute allocation |
| Open tabs could keep stale clock-dependent plans | Minute/focus/visibility clock hook; browser test advances time without edits; date-derived overview/insights/planner defaults refresh too |
| Backup failure could allow damaged primary data to be overwritten | Refuse the write unless exact evidence is safely backed up; quota regression preserves original bytes |
| Malformed storage reopened onboarding over recovery | Startup prioritizes recovery instead of showing a new-user wizard; dedicated onboarding/malformed-backup browser regression |
| Partly damaged persisted records disappeared without recovery access | Backup partial payloads too, show recovery notice and Settings workflow; exact-byte download/merge tests |
| Duplicate import IDs were dropped without a report | Report duplicates; reconcile broken course links; bounded imports and preview errors |
| CSV allowed invalid dates and had no size/count guard | Strict real dates/shape/header validation, 5 MiB and 10,000 records; malformed-import regressions |
| CSV export/import omitted recurrence exceptions | Preserve exceptions and lineage; round-trip test prevents cancelled classes reappearing |
| Repeated CSV timestamps could generate duplicate IDs | Generate robust IDs and skip semantic duplicates against current records in preview |
| Missing persistent usage goals | Optional backwards-compatible schema-3 goals, CRUD, daily progress and explicit unknown status; JSON and reload tests |
| Multiple reduction operations exaggerated recovered minutes | Latest reduction supersedes earlier operations and allocation overrides saved capacity; combined tests |
| Lowering an estimate below completed minutes could invalidate reload | Clamp progress coherently during scenario commit; export/import regression |
| Created timestamps changed representation on every load | Preserve valid timestamp strings; full-state simulation-isolation and reload checks |
| Invalid settings/time fields could normalize silently | Reject invalid times/ranges in forms; normalize imported preferences safely |
| Weak contrast, invalid recurrence aria-label roles and malformed definition lists | Palette contrast corrections, icon roles and dt/dd semantics; final light/dark axe scans pass |
| Button radio groups lacked arrow selection | Shared Arrow/Home/End handling; mobile keyboard radio test |
| Vulnerable production routing and development tools | Router 7.18.5, Vite 8.3.6/plugin 6.2.1, Vitest 5.1.0; clean install, complete regressions and 0-advisory audits |
| Large app chunk and external font request | Route lazy loading, local Inter and page-loading recovery; no large-chunk warning |

Initial authoring runs exposed selector ambiguities and animation-transient contrast measurements.
Tests were stabilized on settled/reduced-motion rendering; genuine contrast/semantics failures were
fixed rather than disabled. All final axe rules remain enabled. Browser console errors are not filtered
away. Initial failures are not counted as passing results.

## Security and performance

The full and production-only npm audit snapshots report **zero known advisories at this check**.
That is not a promise about future disclosures. No `--force`, ignored peer conflicts or paid APIs
were used. The patch updates a major toolchain only after compiling and running the full regression
suite. Node 22.12+ is now required (Node 24 verified). Recharts 2 deprecation remains a maintenance
limitation, not a reported security advisory.

Untrusted uploads remain text/validated JSON; they are not executed or rendered as HTML. Collection
limits bound upload work. Core data stays browser-local. Fonts are now self-hosted assets. Dev and
preview servers bind to loopback by default; public serving requires an explicit host override.

The earlier app chunk was 526.54 kB. The hardening bundle's main app chunk is approximately 377 kB;
the largest JavaScript chunk is the lazy chart chunk at **387.03 kB**. No chunk exceeds the existing
500 kB warning threshold. Actual build filenames/sizes vary with source edits. No synthetic load-time
benchmark or Lighthouse score is claimed. Production refresh/navigation are tested.

## Remaining limitations and release blockers

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md). There is no known remaining P0/P1 functional blocker
in verified supported workflows. Browser-local storage still requires user backups; arbitrary damaged
JSON cannot be reconstructed automatically. Weekly-only recurrence, chronological scheduling,
wall-clock/DST ambiguity, manual-only usage, nonclinical metrics and absent external sync are product
boundaries, not unfinished controls disguised as working features.

Hosted-preview verification is an external acceptance blocker, and owner approval is still required
before merging or deploying. A native-speaker/screen-reader review would add evidence that this pass
does not claim. The application has not been deployed or merged by this task.

## Exact files changed in this hardening pass

The following list is relative to `8a3bb26` and includes this report. PR #1 also retains its earlier
independent-audit changes relative to `main`.

```text
README.md
docs/ARCHITECTURE.md
docs/CODEX_HANDOFF.md
docs/DEVELOPMENT_LIFECYCLE.md
docs/HARDENING_ACCEPTANCE.md
docs/INDEPENDENT_AUDIT.md
docs/KNOWN_LIMITATIONS.md
docs/RELEASE_AUDIT.md
e2e/fixtures.ts
e2e/hardening.spec.ts
e2e/student.spec.ts
index.html
package-lock.json
package.json
public/inter-font-license.txt
src/App.tsx
src/components/habits/usage-dialog.tsx
src/components/habits/usage-goals.tsx
src/components/layout/app-shell.tsx
src/components/onboarding/onboarding-wizard.tsx
src/components/planner/commitment-dialog.tsx
src/components/planner/commitment-list.tsx
src/components/planner/course-dialog.tsx
src/components/planner/task-dialog.tsx
src/components/planner/week-calendar.tsx
src/components/settings/data-manager.tsx
src/components/settings/data-recovery.tsx
src/components/simulation/comparison-panel.tsx
src/components/simulation/scenario-builder.tsx
src/components/ui/date-picker.tsx
src/hooks/use-app.tsx
src/hooks/use-clock.ts
src/hooks/use-schedule.ts
src/index.css
src/lib/analytics/goals.ts
src/lib/form.ts
src/lib/io/csv.ts
src/lib/io/diagnostic.ts
src/lib/io/limits.ts
src/lib/preferences.ts
src/lib/radio-keyboard.ts
src/lib/recurrence.ts
src/lib/scheduling/engine.ts
src/lib/simulation/scenario.ts
src/lib/storage/storage.ts
src/locales/en.ts
src/locales/es.ts
src/locales/fr.ts
src/locales/pt.ts
src/locales/zh-CN.ts
src/main.tsx
src/pages/habits.tsx
src/pages/insights.tsx
src/pages/overview.tsx
src/pages/planner.tsx
src/pages/settings.tsx
src/pages/simulation.tsx
src/tests/hardening.test.ts
src/tests/i18n.test.ts
src/tests/release-regressions.test.ts
src/types/index.ts
vite.config.ts
```
