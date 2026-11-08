# SENTINEL 2.0 — Three-minute demonstration

**Plan for life, not just deadlines.**

Everything below runs offline in one browser tab. No account, no payment, no network calls.

## Before you start (do this once, off-camera)

1. `npm ci && npm run dev` (or open the deployed static build).
2. Open **Settings → Data management**. If the workspace is not empty, export a backup and clear it,
   so the first-run experience is genuine.
3. Keep the browser at a normal laptop width; the layout also works down to 320 px.

## 0:00 — The problem (20 s)

Students do not fail because they cannot list deadlines. They fail because the week is already full.
SENTINEL turns coursework, classes, shifts, rest and screen time into one realistic plan, then lets
you test a decision **before** you accept it.

## 0:20 — First use (30 s)

The setup dialog appears only for a new workspace. Enter an optional name, set study hours and a
daily limit, keep the language and theme, and add one course and one assignment. It is skippable, and
the app states plainly that data stays in this browser.

> Point out: no fictional student is injected automatically. An empty workspace stays empty, with
> instructions rather than fake charts.

## 0:50 — Load the judging scenario (20 s)

**Settings → Load demo data → confirm.** This replaces the workspace with *Alex Morgan*, a fictional
student with four courses, nine assignments, a part-time café job and a week of screen time. All dates
are generated relative to today.

## 1:10 — Intellectual wellness (35 s)

Open **Smart Planner**.

- The weekly calendar shows classes, shifts and **generated study blocks**, each labelled with the
  assignment it belongs to. Click a study block to open that assignment.
- Below, *Could not be scheduled* reports anything that does not fit, in minutes, with the reason.
- Switch to the **Courses** tab: add a course, edit it, archive it, then try deleting one and note
  that SENTINEL asks whether to keep or delete its assignments — nothing is silently destroyed.
- Create a task with priority **High**, a deadline via the calendar and 90 minutes. Save: the plan
  recalculates immediately. Refresh the page: it is still there.

## 1:45 — Emotional and financial wellness (45 s)

Open **Wellness Insights**. The Workload Pressure score shows its full formula, and the four
Maryville dimensions each link to the feature that acts on them.

Open **Simulation Lab**:

1. *Add a work shift* — Tuesday 17:00–21:00, add it to the comparison.
2. The panel shows **Current plan vs Simulated plan**: scheduled study, unscheduled coursework,
   conflicts and pressure. The explanation lines are computed, not written in advance.
3. Nothing has been saved yet. **Reset** discards the preview; **Apply scenario** asks for
   confirmation and only then writes to storage.
4. Repeat with *Change a task deadline* or *Reduce screen time* to show the trade-off between paid
   work and academic time — and that an ineffective change is reported as having no measurable effect.

## 2:30 — Physical wellness and habits (15 s)

**Digital Habits**: entries are manual; totals, the seven-day trend and category breakdown all use the
stored rows. The simulator caps any proposed reduction at the discretionary minutes actually recorded
and never claims they become study time automatically.

## 2:45 — Lifecycle and close (15 s)

- **Settings → Import/export**: JSON export, then a JSON import preview offering **merge or replace**
  with counts and skipped duplicates; CSV export plus downloadable templates for courses, assignments
  and commitments.
- Data is local-only; the README and `docs/` explain the architecture, the algorithm, the development
  history and the known limitations (no iCal yet, weekly recurrence only, translations not yet
  reviewed by native speakers).
- Close on the statement: *SENTINEL does not tell students to work harder. It shows them what their
  week can actually hold.*

## If something goes wrong

- **No data after reload?** The browser blocked localStorage; SENTINEL shows a banner instead of
  pretending to save.
- **Demo dates look stale?** Use *Reset demo data* — it regenerates relative dates.
- **A judge asks for a number:** every metric opens its own explanation; the pressure formula is
  published in the UI and in the README.
- **Judging rubric mapping:** Functionality → the live create/edit/delete/persist flow; Wellness → the
  four dimensions page; Creativity → the simulation of decisions before commitment; Lifecycle → README
  plus `docs/DEVELOPMENT_LIFECYCLE.md`.
