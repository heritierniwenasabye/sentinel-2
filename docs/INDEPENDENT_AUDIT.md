# Independent engineering audit

Audit performed 7 November 2026 (America/Chicago; executor logs use 8 November UTC).
Baseline: `98d72ca445903ba447adc35b4e8b09b560b20ba7`.
Branch: `audit/independent-release-review`. Existing design and architecture retained.

## Release assessment

Suitable for a reviewed hackathon demo after the changes in this branch. This is not a certification
of every browser, timezone, screen reader or deployment provider. No production deployment or merge
was performed. The previous release report is historical evidence, not this audit's results.

## Reproduced defects and changes

| Severity | Before | Change and evidence |
| --- | --- | --- |
| P1 | Three 60-minute assignments could produce 180 uninterrupted study minutes: breaks were tracked only after a single 90-minute task block. | Traverse slots chronologically across all assignments; enforce configured breaks between blocks. Regression tests reproduce the original zero-minute gaps. |
| P1 | A 90-minute assignment with 15 minutes completed received 90 more minutes, exceeding its remaining 75. | Place only whole 30-minute units that fit remaining demand; retain the 15-minute remainder as unscheduled. Demand always equals planned plus unscheduled. |
| P1 | A recurring Sunday night shift ending Monday morning was absent from Monday's plan. | Expand overlapping occurrences starting before the requested window as well as inside it. |
| P1 | On DST Sundays, 09:00 study/recurrence windows became 10:00 in spring or 08:00 in autumn in America/Chicago. | Construct wall-clock times using local hours; preserve recurrence end wall-clock time and calendar-day spans. Calendar days use calendar arithmetic. Tests cover both 2026 transitions. |
| P1 | Saved recovered-focus capacity had no effect on ordinary scheduling. | Use the persisted bonus unless the simulation supplies an explicit per-day override; never add both. |
| P1 | Editing an entire recurring series from a later occurrence changed its start to that occurrence, discarding earlier weeks. | Series scope starts from the original record; occurrence scope starts from the clicked date. Browser test asserts both anchors. |
| P2 | Available capacity included elapsed days: near Sunday night it could still show 56 hours. | Derive capacity from remaining eligible slots, not elapsed free intervals. |
| P2 | Planner denominator counted partly scheduled work twice, while later assignments disappeared altogether. | Count unique assignment ids; list all horizon work and separately display later, unfinished work with an explicit explanation in all five languages. |
| P2 | Simulation removal picker excluded weekly series anchored before the week. | Filter using expanded occurrences. Browser test finds an October-anchored class in November. |
| P2 | Scenario tabs clipped on narrow screens. | Wrap existing tab controls without changing the design system. |
| P2 | Explicit identical scheduler inputs returned a new wall-clock generation timestamp. | Use the explicit `now` for deterministic output. |

Regression failures were observed before the fixes: five failures in UTC and seven in
America/Chicago in the original seven-case regression file. Additional tests cover sleep,
45-minute breaks, saved focus bonuses, horizon exclusion and conservation of remaining demand.

## Verification evidence

Baseline independently passed 75 Vitest tests in 11 files, TypeScript and production build.
Final verification:

| Command / check | Result |
| --- | --- |
| `TZ=UTC npm test` | 85 passed, 12 files |
| `TZ=America/Chicago npm test` | 82 passed before the final 3 regression additions |
| `TZ=America/Chicago npx vitest run src/tests/release-regressions.test.ts` | Final 10 regressions passed, including both DST transitions |
| `npm run typecheck` | Passed, including the committed browser tests/configuration |
| `npm run build` | Passed; largest app chunk 526.54 kB / 152.92 kB gzip; existing chunk-size warning |
| Chromium against the Vite development server | First 5 workflow tests passed |
| `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --reporter=line` against `vite preview` | All final 6 browser tests passed against the production bundle (21.0 seconds); includes 30 route/viewport combinations |
| `git diff --check` | Passed |

Initial browser test authoring runs failed on incorrect button-label selectors; those tests were
corrected to match the rendered controls. One overlapping test-run artifact collision was discarded;
the final production run was sequential, clean and passed without retries.

Browser tests use actual Chromium with fresh isolated contexts, real pointer/form controls and
localStorage assertions. They freeze the application clock to Monday 2 November 2026 08:00
America/Chicago, so deadlines and schedule assertions are repeatable. Fixture names identify audit
test records, not actual student data. Responsive checks load the real six routes at 320, 375, 768,
1024 and 1440 pixels with demo data; page overflow is measured, not inferred from CSS.

## Workflow coverage and boundaries

- First run: onboarding appears, skip leaves zero courses/tasks, course create/edit, High priority,
  calendar selection, 90-minute task, visible generated block, reload persistence.
- Courses: archive/restore, delete with keep/unlink, relink task, delete with associated assignments.
- Assignments: priority/duration/completed minutes edits, completion/reopen, course change, recalculation.
  Browser coverage also moves a deadline beyond the horizon, checks its unfinished state, then deletes
  the task. Every possible deadline/time combination is not exhaustively tested.
- Commitments: class/work/personal creation, edit/delete, weekly series, conflicts, occurrence detachment
  with exception, original series anchor preserved, occurrence deletion and series deletion. Recurrence
  end/weekday rules have unit tests.
- Habits: create/edit/delete/reload; reduction cap and daily/weekly arithmetic have pure-function tests.
  **Persistent usage goals are not implemented.** The reduction input is a simulation, not a saved goal.
- Settings: planning preference save, three themes, five languages, demo load/reset and cancellation of
  destructive clear. JSON merge/replace and CSV imports/exports are exercised in the browser suite;
  parser validation and actual serialization round trips are covered by unit tests.
- Simulation: add shift, preview without mutation, reset, confirmed apply; screen-time caps and
  immutability covered by unit tests. All possible scenario combinations were not exhaustively tested.
- No native-speaker translation assessment or screen-reader audit is claimed.

## Scheduling semantics

The engine allocates blocks only in the displayed Monday–Sunday week. Its demand scope includes
unfinished work due through seven days after that week; earlier overdue work remains explicit.
Later tasks appear separately and are excluded from this week's totals, not considered complete.
A partly scheduled task can count as a task with study blocks while still having an unscheduled
remainder: the separate unscheduled minutes are the completeness check.

Remaining demand below 30 minutes stays unscheduled under the existing granularity. Capacity is an
upper bound on eligible free slots under the daily limit; breaks and deadlines may prevent all of it
being used. This is a deterministic chronological heuristic, not an optimal packing solver.

Local wall-clock date/time persistence intentionally preserves the clock value when changing zones.
DST tests cover UTC and America/Chicago, not the world's full timezone database. JavaScript resolves
nonexistent spring-forward times forward and ambiguous fall-back times to its default occurrence;
the app has no UI to choose the second repeated clock time. Multi-day recurring commitments keep
calendar-day span and wall-clock end time rather than a fixed elapsed duration across DST.

## Security and deployment review

- Static React SPA; no runtime account, API, analytics, device monitoring, or paid service added.
- Imported user content is rendered as React text. Source search found no `eval`, `new Function`,
  `dangerouslySetInnerHTML`, runtime `fetch`, or tracked environment secrets.
- JSON upload already has a 5 MiB size guard (contrary to the older limitations document). CSV has no
  corresponding cap. Corrupt-storage recovery is still accessible only through devtools.
- `npm audit --omit=dev` reports two moderate package entries (`react-router` and its dependent
  `react-router-dom`), comprising redirect and SSR deserialization advisories. Links are internal static
  route strings and there is no SSR hydration path. No forced routing major upgrade was made.
- Full `npm audit` reports 9 package entries: 6 moderate, 1 high (`vite`), and 2 critical (`vitest`, `tinypool`), including transitive development tooling. These are release-engineering follow-ups; the static production bundle does not ship the dev/test server. Do not expose development or test UI servers publicly. A toolchain major upgrade was not folded into this scheduling fix.
- Google Fonts remains an external request. Student records are local, but a literal claim that no
  network request ever leaves the device would be false. Offline core behavior uses fallback fonts;
  offline installation/service-worker caching is not implemented.
- Production build succeeds with the existing >500 kB chunk warning. No new runtime dependencies.
  Playwright is a development-only dependency requiring Node 20+ for browser tests.
- Vercel and Netlify SPA fallback configuration exists; deployment to either host was not performed.

## Rubric and release actions

Functionality: rehearse the deterministic create → schedule → simulate → persist demonstration.
Wellness: explain intellectual, emotional, financial and physical mappings as planning aids, not
medical outcomes. Creativity: show a scenario with and without a measurable effect. Lifecycle: explain
the reproduced defects and tests above instead of presenting earlier reports as proof.

Before judging: export real data, use a separate demo profile, load date-relative demo data and rehearse
on the actual display and deployed origin. Maintain manual JSON backups; storage is browser-local.
