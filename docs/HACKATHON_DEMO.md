# SENTINEL 2.0 — Three-minute demonstration

**Plan for life, not just deadlines.** This script uses optional fictional data and real calculations.
Use a separate browser profile. No account or paid service is needed. A running local/static host is
required; once loaded, the calculations and data edits stay in the browser. Do not claim an offline
installation or background phone monitoring.

## Rehearse before judging

1. With Node 22.12+, run `npm ci`, `npm run build`, then `npm run preview`. Open the production preview.
2. Export any data worth keeping. In the separate demo profile, skip setup, open **Settings → Load
   demo data → confirm**. This installs fictional Alex Morgan: four courses, nine assignments and
   date-relative commitments/usage. Use **Reset demo data** before each rehearsal; keep the chosen
   theme/language, and start on Overview. Clearing a workspace does not reopen onboarding.
3. On Smart Planner, find **a future blue study block this week**. Write down its actual day/start/end
   and assignment. During the demo, use that exact interval for an “Extra campus shift.” Do not use a
   fixed Tuesday date: it may already be past. Comparison is explicitly for the current week.
4. Rehearse the shift once, read the actual changes, then **Reset simulation**. Work may move to another
   free slot, remain partly unscheduled, or leave study totals unchanged. Never promise a particular
   pressure score or number of lost study hours. The fixed-commitment row always reports the booked
   time inside the displayed week; explanations say when the study/capacity/conflict totals are unchanged.
5. If this week has no future study block (for example Sunday after study hours), demonstrate an honest
   no-change result and the planning horizon. Do not manipulate the dataset to manufacture an effect.
   Rehearse during study hours if a visible reallocation is central to the presentation.

The seven weekday 10:00 rehearsals in `product-polish.test.tsx` load the real demo generator, select
an actual future block, add a shift and check computed commitment time and non-overlap. Browser tests
also rehearse Monday and Saturday. These are regression fixtures, not fabricated product analytics.

## 0:00–0:25 — Problem and current plan

“Deadlines are only half the problem. Classes, work, rest and available study time have to fit too.”

On **Overview**, point to planned study, available capacity and upcoming deadlines. Explain that the
label **Unscheduled** means work still needing a slot, not work already completed. The dataset is
explicitly fictional; a new student's workspace starts empty.

## 0:25–1:00 — Show a realistic schedule

Open **Smart Planner**. Point to one fixed class/shift and the future blue study block identified
beforehand. Click that block to open its real assignment, show deadline, priority and remaining study
minutes, then **Cancel**. Point to any unscheduled work and its reason. The planner protects sleep,
breaks and daily limits; it reports overload rather than silently dropping it.

Avoid creating and editing several courses live inside this 35-second section. Course management,
first-use setup and imports are available for questions after the main presentation.

## 1:00–2:00 — Rehearse a decision before saving

Open **Simulation Lab** and read the displayed week. The two cards start as the same plan.

1. Under **Add a work shift**, enter “Extra campus shift” using the actual future block's date and times.
2. Click **Add to comparison**. Point to the named pending change and the “saved data is unchanged” notice.
3. Compare **Fixed commitments**, planned study, unscheduled coursework, available capacity and conflicts.
   Read the computed **What this means** explanation. The chart uses hours; tooltips show durations.
   A shift can move study elsewhere without reducing total study. Say so when that is the result.
4. Click **Reset simulation**: the hypothetical change disappears and the saved plan is unchanged.
5. Briefly show **Apply scenario** on a repeated preview: it lists changes and asks for confirmation.
   Choose **Keep simulating**, then reset. Applying would save the listed changes locally; Reset does
   not undo an already applied scenario. Demonstrate actual apply/reload only if time permits.

## 2:00–2:30 — Wellness and manual habits

On **Wellness Insights**, point to the transparent pressure formula and intellectual, emotional,
financial and physical dimensions. This is a planning heuristic, not a clinical assessment.

On **Digital Habits**, show manual totals and daily goals. “No entry today” means unknown usage.
The log scrolls within its panel so goals and the reduction simulator stay reachable. Reducing
self-reported discretionary usage is hypothetical; it becomes extra planning capacity only after an
explicit allocation action, not automatically.

## 2:30–3:00 — Persistence, lifecycle and close

Open **Settings**, show JSON backup and the confirmed import preview (cancel it if opened).
Describe the lifecycle: deterministic planning → reproduced defects → regression tests → browser
and accessibility checks. Refer to the repository's acceptance/polish reports for exact results.

Close: “SENTINEL shows what a student's week can hold, and lets them test a decision before committing.”

## Questions and recovery

- **Fresh start?** Use a new profile to show onboarding. Workspace clearing retains appearance,
  language, onboarding completion and raw recovery backups; its confirmation explains the scope.
- **Storage warning?** Export the current in-memory workspace before reloading. A failed write cannot
  survive a refresh. Settings offers raw-backup recovery when damaged data was preserved.
- **Numbers differ from rehearsal?** Dates and free time are relative to the real clock. Read the
  displayed results; no result in the spoken script is hardcoded.
- **No hosted preview?** Local production testing is complete; hosted deployment verification still
  needs a real URL and owner approval. This work did not deploy or merge anything.
