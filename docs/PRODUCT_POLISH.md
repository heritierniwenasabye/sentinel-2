# Final product polish and demo quality gate

Scope: follow-up to the hardening gate at `cdba8ff`, on PR #1's existing branch.
Date: 7 November 2026 America/Chicago (8 November UTC in execution logs).
No redesign, major feature, scheduling-rule change, demo-data inflation, merge or deployment.

## UX issues and fixes

| Issue observed | Implemented correction |
| --- | --- |
| Simulation chart plotted hours but its subtitle and tooltip said minutes; 1.5 hours appeared as “1.5 min” | Correct hours subtitle, duration-formatted tooltips and accessible table cells in all five locales; regression asserts “1 h 30 min” |
| Negative chart margins clipped the left digit of habit trend axis labels on mobile | Reserve non-negative left margins and sufficient tick width consistently across the three vertical charts; browser test checks tick rectangles stay inside the SVG |
| A shift could add real fixed time while study totals stayed unchanged, making the result hard to explain | Display existing computed fixed-commitment totals in both comparison cards and a computed fixed-time explanation; explicitly describe which planning metrics remain unchanged |
| Capacity gain was styled as a warning and loss as positive | Correct explanation tones; study-volume changes remain neutral rather than implying more study is automatically better |
| Simulation lacked an explicit visible week and could imply Reset undoes a saved change | Show current-week date range and clarify preview, reset, confirmation and absence of automatic undo after apply |
| Three narrow mobile date/time columns clipped native controls | Date spans a full row, with start/end side by side on mobile; desktop/tablet retain their existing layout |
| Forty-two demo usage rows pushed goals and reduction controls far below the main page | Bound the log's height, retain all rows in a labelled keyboard-focusable scroll region, add a scroll hint and keep table headers sticky |
| Calendar Escape could dismiss the whole unsaved form | Dismiss the inline calendar/listbox first; desktop/mobile regressions preserve the typed draft and then explicitly cancel the form |
| Small calendar navigation, toast close and pending-change remove targets | Use consistent 32 px targets without expanding the visual design |
| Overview “Remaining: 0” meant unscheduled time, not completed work | Label that quantity “Unscheduled” in all locales; calculations unchanged |
| Generic pressure formula footer appeared under unrelated overview insights | Remove the irrelevant footer; retain the actual formula on Wellness Insights |
| Pending empty-state instruction repeated twice; arrows implied explanation rows were links | Show the empty instruction once and remove noninteractive arrows |
| Empty habits copy described zero usage as a measured daily average and an over-limit request | Ask for manual entries instead; only show reduction-cap guidance when discretionary data exists |
| Clearing/export descriptions omitted retained backups and newer records; form errors lacked associations | Describe actual clear/export scope, including goals and retained recovery backups; associate scenario/reduction errors with their inputs |
| Old three-minute script crammed in too much CRUD, used a possibly past Tuesday shift, implied offline installation, reopening setup after clear, clickable metric explanations and general undo | Rehearse the production build, select a real future study block for the scenario, keep optional CRUD for questions, and state actual persistence/reset behavior |

The optional Alex Morgan dataset was inspected and left unchanged. Seven weekday 10:00 rehearsals
use its real generator, select an actual future study block and add a shift over that interval.
Tests assert added fixed minutes and absence of overlapping study, not a predetermined pressure or
study-loss number. A late-Sunday rehearsal can legitimately have no remaining study slot; the script
explains an honest no-change demonstration instead of manufacturing a result.

## Visual and interaction review

All six routes were captured and inspected with fictional demo data at **1440×900**, **768×1024**
and **375×812**. Empty states were additionally reviewed on desktop/mobile. Typography, card spacing,
alignment, contrast, header/button hierarchy and route styling were otherwise consistent; they were
preserved. Native controls and task-calendar/weekly-commitment dialogs were checked at the three
sizes. Long calendars/tables retain intentional internal scrolling rather than page overflow.

The existing browser suite exercises loading, save feedback, deletion/replace confirmations,
validation, cancel, keyboard selection, focus and persistence. The new polish browser tests rehearse
Monday desktop and Saturday mobile, check the displayed week/fixed-time explanation, unchanged saved
baseline, apply/cancel/reset semantics, single empty instruction, readable date/time columns,
scrollable complete usage log, reachable goals, unclipped axes and nested Escape behavior.

The chart tooltip regression, capacity-tone regression and seven deterministic demo-day rehearsals
are in `src/tests/product-polish.test.tsx`. These test actual calculations; no fake analytics or
hardcoded product result was added. No existing test was disabled or weakened.

## Final gate

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Unit/integration | **146 passed in 14 files** |
| Production build | PASS, no large-chunk warning |
| Chromium against production `vite preview` | **19 passed in 1.5 minutes**, no retries |
| Responsive checks | **30 passed**: six routes × 320/375/768/1024/1440 px |
| Accessibility | Light/dark WCAG 2 A/AA and 2.1 AA scans pass on six routes and goal dialog; keyboard/modal regressions pass |
| Browser console/runtime errors | None in the final suite; errors remain automatic test failures |
| Full npm audit / production-only audit | **0 reported advisories** in each |
| Diff whitespace check | PASS |

Commands: `npm run typecheck`, `npm test`, `npm run build`,
`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --reporter=line`,
`npm audit --json`, `npm audit --omit=dev --json`, `git diff --check`.
The preview is a local production server, not a hosted deployment. No test was removed or weakened.

## Remaining limits and readiness

Browser-local data, manual habit entries, weekly recurrence, a deterministic chronological scheduler
and nonclinical wellness indicators remain explicit product boundaries. There is no general undo for
applied scenarios. Native-speaker, screen-reader, Safari and Firefox certification are not claimed.
The static host is needed for fresh navigation; there is no service-worker offline installation.

**Ready for hosted deployment verification after owner approval.** No hosted URL is available here,
so hosted rewrites/cache/refresh behavior remains unverified. This task did not merge PR #1 or deploy.
See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) for the supported boundaries and
[HARDENING_ACCEPTANCE.md](HARDENING_ACCEPTANCE.md) for the preceding engineering matrix.
