# Final release-candidate verification

Verification completed: 8 November 2026 (America/Chicago). Work began on 7 November;
execution logs use UTC.

## Candidate and scope

Tested application/test commit: **`0231c6fe4e09e7df720f36e9466865811a2cefe4`**.
Branch: `audit/independent-release-review`, PR [#1](https://github.com/heritierniwenasabye/sentinel-2/pull/1).
Starting head: `0a579057596aa946c72950f34d470ffaf0051682`, clean working tree.
The branch contains the independent audit (`8a3bb26`), hardening (`cdba8ff`) and polish
(`0a57905`) rounds. Main was `98d72ca445903ba447adc35b4e8b09b560b20ba7`.
This report and its documentation pointers are subsequent documentation-only changes;
the tested application, dependencies and tests remain frozen at the SHA above.

README, architecture, release/independent audits, hardening acceptance, product polish,
known limitations and the hackathon demo script were read. Their historical test counts
were treated as claims to recheck. Source inspection covered scheduling/recurrence,
simulation/commit operations, storage validation/recovery, chart units and accessible
alternatives, calendar/dialog interactions and the latest layout changes.

Classifications: **PASS** means executed or inspected as stated; **FAIL** means a remaining
reproducible defect; **BLOCKED** means verification was unavailable. A passing row is
bounded by its evidence, not a universal correctness or accessibility certification.

## Engineering gate

Environment: Node **v24.22.1** (supported requirement >=22.12), Chromium
**156.0.8078.79**, Debian 13, Playwright 1.65.0, Vitest 5.1.0, Vite 8.3.6.

| Check | Classification | Current execution |
| --- | --- | --- |
| Clean dependency installation | PASS | `npm ci --cache /tmp/sentinel-npm-cache --no-audit --no-fund`; 305 packages installed |
| TypeScript | PASS | `npm run typecheck` |
| Lint | BLOCKED | No lint script/configuration is provided; no lint pass claimed |
| Unit/integration suite | PASS | `npm test`: **150 tests, 15 files** |
| Production bundle | PASS | `npm run build`; no chunk-size warning |
| Production Chromium suite | PASS | **27 tests**, fresh contexts, actual `vite preview` bundle |
| Scheduling/time-related suites | PASS | **91 tests in six files per timezone**, UTC, America/Chicago, Asia/Kathmandu |
| Full dependency audit | PASS | `npm audit --json`: **0 vulnerabilities** in every severity |
| Production dependency audit | PASS | `npm audit --omit=dev --json`: **0 vulnerabilities** in every severity |
| Whitespace/conflict hygiene | PASS | `git diff --check` |

The initial clean baseline independently passed 146 unit/integration tests before the
new regressions were added. No tests were disabled or assertions relaxed.
Installation emits upstream deprecation notices for Recharts 2 and whatwg-encoding;
the audit reports zero advisories, which does not certify absence of unknown issues.

Production command: `npm run preview -- --host 0.0.0.0 --port 3020`.
Browser command:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3020 CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --reporter=line
```

The preview server was running before Playwright; its reuse configuration did not start
a development server. For each zone, `TZ=<zone> npx vitest run` ran these files:
`scheduling`, `courses-recurrence`, `release-regressions`, `hardening`, `final-release`,
`product-polish` under `src/tests/` (the last is `.test.tsx`, others `.test.ts`).
Local execution logs are under ignored `work/final-rc/`; screenshots are Playwright
artifacts under `test-results/`. They are session evidence, not committed product assets.

## Test inventory and actual coverage

| Unit/integration file | What it verifies |
| --- | --- |
| scheduling.test.ts | Ordering, packing, protected time, deadlines, capacity and impossible work |
| release-regressions.test.ts | Breaks between tasks, demand arithmetic, horizon, overnight carry-in, saved capacity |
| final-release.test.ts | Fractional-offset local slot boundary, exact horizon edge, manual ordering/nonmutation, overnight exact demand |
| hardening.test.ts | Recovery/import limits, malformed records, goals, 30 seeded schedule invariant cases, DST, scenario operations |
| courses-recurrence.test.ts | Course relationships/lifecycle and weekly series/occurrence semantics |
| simulation.test.ts | Immutable previews, removing commitments, capped reductions, persistent apply |
| analytics.test.ts | Manual usage aggregation/reductions and bounded, explained pressure calculation |
| storage.test.ts | Persistence, migration, normalization, corrupt input, demo/import/export |
| csv.test.ts | CSV quoting, templates, course resolution, validation and recurrence |
| i18n.test.ts | All five dictionaries, key/interpolation parity and static UI key references |
| form-controls.test.tsx | Accessible calendar/time and control behavior |
| task-workflow.test.tsx | Assignment form workflow and validation |
| assignment-lifecycle.test.tsx | Task edit/progress/completion/deletion workflows |
| course-manager.test.tsx | Course management controls and deletion outcomes |
| product-polish.test.tsx | Units/explanations, unchanged deltas, nested Escape and seven-day calculated demo cases |

Browser inventory: `student.spec.ts` has six broad lifecycle/import/responsive tests;
`hardening.spec.ts` has eleven onboarding, recovery, goal, keyboard, live-clock,
simulation, mobile-journey and accessibility tests; `product-polish.spec.ts` has two
weekday/weekend demo rehearsals; `final-release.spec.ts` adds eight route/history,
visual, locale, downloaded-backup/demo, independent simulation and focus regressions.
`fixtures.ts` captures page exceptions, console errors, HTTP >=400, resource failures,
external requests and external top-level navigation for every browser test.
Intentional route changes can produce `net::ERR_ABORTED`; these are retained as separate
navigation-cancellation diagnostic attachments. Other request failures fail the gate.

## Feature acceptance and student journey

| Feature / journey segment | Classification | Evidence |
| --- | --- | --- |
| All six routes: direct load, reload, navigation, browser history | PASS | Actual links, back/forward and exact stored-data comparison after each route/reload |
| Empty first use and completed onboarding | PASS | Independent clean browser contexts; onboarding validation/back/appearance/language and skip paths |
| Three courses and six assignments | PASS | Mobile journey creates them through controls, with varied deadlines, priority and duration |
| Weekly classes, two shifts, personal commitment | PASS | Mobile journey creates two class series, two work shifts and personal event; planner renders calculated sessions |
| Deadline/priority/progress and complete/reopen | PASS | Mobile journey plus assignment lifecycle assertions; later-deadline unfinished work remains visible |
| Course archive/restore and both deletion outcomes | PASS | Mobile journey and dedicated lifecycle tests verify retained/detached versus deleted assignments |
| Recurring series edit, occurrence edit/delete | PASS | Student browser tests plus recurrence unit tests verify exceptions and unaffected occurrences |
| Manual usage create/edit/delete | PASS | Student browser lifecycle; calculated category/app totals |
| Usage goal create/edit/delete/cancel and unknown data | PASS | Dedicated goal browser test, mobile journey and goal arithmetic tests |
| Planning preferences and explicit focus-capacity saving | PASS | Persistence/reload assertions, keyboard radio changes, allocation off/on |
| JSON/CSV download and import | PASS | Actual downloaded bytes, validation previews, replace/merge and CSV templates/exports |
| Confirmed clear and actual JSON restore | PASS | Mobile journey compares complete restored workspace after refresh |
| Save/cancel/delete/error feedback | PASS | Validation alerts, cancellation without mutation, confirmation dialogs, write-failure warning and recovery UI |
| Keyboard/dialog/date controls | PASS | Calendar arrows, select/radio keys, goal-dialog focus cycle/restoration, nested Escape regression |

The 26-step student lifecycle is covered across the mobile end-to-end journey and the
specialized course, recurring-event, usage and goal scenarios. It is not claimed that
one uninterrupted test contains every subcase. Tests inspect persisted state at mutation
boundaries (including preview/cancel, completion, deletion, recovery and restore), with
full-object comparisons for round trips; they do not snapshot every field after every click.

## Scheduling mathematics

**PASS:** Independent source inspection and executable cases cover deadline-first,
priority-second ordering; remaining estimated minus completed minutes; 30-minute starts
with short final blocks; daily and continuous limits; breaks across assignment boundaries;
sleep and fixed commitments; overdue/impossible work; weekly exceptions; Sunday overnight
carry-in; exact scheduling horizon; current-clock cutoff and live minute refresh.

Thirty seeded workloads each contain twelve varied tasks and six commitments. Assertions
check repeated-input equality, no study overlap, protected commitment exclusion, deadline
bounds, daily caps, required separation, per-task allocation <= remaining demand and
`planned + unscheduled = eligible remaining demand`. Explicit small cases provide manual
expected outcomes instead of only mirroring implementation formulas. Later-horizon work
remains unfinished outside the current totals. America/Chicago spring/fall transitions
and Kathmandu fractional-offset alignment run alongside UTC. These are bounded generated
cases, not exhaustive property exploration or an optimal-packing proof.

## Simulation correctness and demo

**PASS:** Individual operation coverage and combined browser scenarios exercise added
shifts, removed commitments, deadline changes, daily capacity, rest/study windows and
manual discretionary-time reductions. Preview leaves baseline data unchanged; cancellation
and reset preserve it; confirmed apply persists listed changes and survives refresh.
Saved focus capacity is replaced rather than double-counted; the latest reduction wins.
Fixed commitments and study are separate metrics; charts use hours and duration tooltips.
Unchanged study totals are explained without claiming recovered study or clinical benefit.
Reset clears pending operations and does not promise to undo applied changes.

An independently constructed 30-minute task due at 09:30 fits the default 09:00–09:30
window. A hypothetical shift covering that window yields **30 fewer planned minutes and
30 more unscheduled minutes**. Reset then adding a 22:00–23:00 shift yields **60 more fixed
minutes with study/capacity/conflict metrics unchanged**. Both are real engine results,
asserted through the rendered explanation; neither preview changes saved data.

The fictional demo and `HACKATHON_DEMO.md` were rehearsed at Monday 2 November, 1440px,
and Saturday 7 November, 375px. Existing browser rehearsals inspect a real future study
block, add the conflicting shift, read calculated comparison, cancel and reset. New
rehearsals additionally download the real JSON, apply a shift selected from the planner's
actual block, refresh, verify exactly one added commitment and unchanged assignments,
then restore and compare the original exported workspace. Seven weekday unit rehearsals
also protect date-relative demo behavior. No fixed performance claim or fake analytics
was added. Script timing is a three-minute presentation guide, not a measured human speech
or live-presentation timing certification.

## Visual, accessibility and localization

**PASS:** Sixty actual full-page captures cover six routes × 320/375/768/1024/1440px ×
light/dark. Screenshots were inspected as route/theme contact sheets, supplemented by
failure captures during diagnosis. Assertions check page overflow and chart Y-axis bounds;
existing responsive coverage adds thirty route/width checks. Planner scrolling and compact
mobile controls remain usable; no remaining material alignment, spacing, axis clipping or
modal collision was found in these captures. This is screenshot inspection, not pixel-diff
baseline certification.

**PASS:** Production axe scans run on every route in both themes and the usage-goal dialog
with WCAG 2 A/AA and 2.1 AA tags. Keyboard checks cover labels/errors, radio/select/calendar
interaction, modal semantics, twelve Tab presses remaining inside a goal dialog, Escape
and focus restoration. Nested calendar Escape retains the parent form. Chart alternatives
remain available to assistive technology. Captures also exercise reduced-motion preference.

**PASS:** English, French, Spanish, Portuguese and Simplified Chinese key/interpolation
checks pass; populated mobile browser checks visit all six routes in each language at
320px with correct document language, no unresolved key/interpolation markers or page
overflow. Source/dictionary inspection found no new untranslated product copy in this
change. Proper names, student-entered data and fictional demo titles retain their content.

**BLOCKED:** Native-speaker review, actual screen-reader sessions, exhaustive zoom/input
method and Safari/Firefox/mobile-device certification were not performed. Automated scans
and key checks do not establish those certifications.

## Recovery, import safety and security

**PASS:** Corrupt and partially damaged storage, exact raw-backup downloads, validation,
cancellation, confirmed safe merge and preserved damaged bytes are exercised. Denied reads,
quota failures, inability to back up, and multiple damaged payload protection have unit
coverage. Browser write failures warn visibly; in-memory export works, and refresh correctly
returns the last successful persisted value rather than claiming unsaved durability.

**PASS:** Executed import tests cover malformed CSV/JSON, 5 MiB CSV boundary, 10,000-record
CSV/JSON bounds, duplicate IDs, impossible dates/durations, broken course links, recurrence
round trips and actual JSON replace/restore. Inspection verifies the JSON upload's matching
5 MiB guard and invalid recurrence-exception filtering/reporting; those two specific guards
were inspected, not separately injected through the final browser suite. Invalid records
are reported before confirmation; valid records are retained. CSV is not a complete backup.

**PASS:** Both npm audits report zero advisories. Tracked-file credential-signature search
found no AWS access-key, GitHub token or private-key markers; tracked env-file inspection
found only `src/vite-env.d.ts`. Source search found no unsafe HTML insertion/evaluation or
application fetch/HTTP integration. Passing browser instrumentation reports no unexplained
runtime/console/HTTP/resource error or unexpected external request/navigation in tested
flows. This bounded inspection is not a penetration test or proof about every secret format.

## Defects reproduced and corrected

| Defect | Classification after correction | Narrow correction and regression |
| --- | --- | --- |
| UTC rounding skipped a local 09:00 slot in UTC+05:45 | PASS | Local-minute remainder rounding; exact 15-minute deadline regression failed before fix and passes in all three zones. Scheduling policy is preserved. |
| Demo omitted empty goals until reload normalization | PASS | Initialize `usageGoals: []`; exact route/reload and actual-export restore comparisons now match. No fake goals added. |
| Portuguese long metric label overflow at 320px | PASS | Allow metric-card text to shrink/wrap; five-locale mobile route regression. |
| Hidden accessible chart tables widened French mobile page | PASS | Put tables inside visually hidden clipped wrappers; retain table semantics/content and rerun locale/axe checks. |
| Closing controlled usage-goal dialog lost keyboard focus | PASS | Shared dialog remembers a connected opener and restores focus unless the caller overrides it; twelve-Tab/Escape/trigger regression failed before correction and passes afterward. |

The first expanded browser run failed on demo shape and locale overflow; these failures
were investigated rather than ignored. The first full freeze then caught missing focus
restoration (26/27 passed); after the narrow correction the entire suite passed 27/27.
The new independent shift test initially used a
time-bearing accessible-name selector for a no-course block; its actual title attribute
contains the times, so the selector was corrected while preserving the expected time and
numerical outcome assertions. No product change was needed for that test-authoring issue.
README also corrects stale onboarding-clear guidance and the supported Node version.

## Boundaries and release decision

**PASS:** No remaining reproducible failure in the executed local gate, no known P0/P1
functional defect, unresolved demonstrated data loss, or unexplained production-browser
error. No application redesign, new feature, dependency upgrade, merge or deployment.

Supported boundaries remain in [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md): local-profile
storage, manual usage, weekly recurrence, deterministic heuristic scheduling, local
wall-clock DST resolution, no automatic sync/accounts/calendar integration/clinical claims,
no service worker and no undo of already applied scenarios.

**BLOCKED:** No approved hosted deployment URL was available. Host SPA fallback/deep-link
refresh, HTTPS/CSP/cache behavior, real-origin storage/downloads, deployment artifacts and
remote health remain to be verified after owner-approved hosting. Local preview success
does not establish any of these host properties. PR #1 remains open; merge and deployment
require the owner's approval.

**READY FOR HOSTED VERIFICATION**
