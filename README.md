# SENTINEL 2.0

**Plan for life, not just deadlines.**

A digital wellness decision engine for university students.

Current product polish/demo gate: [`docs/PRODUCT_POLISH.md`](docs/PRODUCT_POLISH.md).

Preceding release-hardening evidence: [`docs/HARDENING_ACCEPTANCE.md`](docs/HARDENING_ACCEPTANCE.md). SENTINEL turns coursework, classes, work
shifts, appointments, rest and screen-time habits into a realistic weekly plan — then lets you simulate
decisions before you commit to them.

Everything is computed from your own entries by deterministic TypeScript modules. There is no AI
prediction, no external service, no account and no API key. Data lives in your browser.

### Hackathon wellness alignment

SENTINEL addresses student digital wellness as a **planning problem**, not a screen-time scoreboard.
It protects sleep and breaks, caps continuous study, surfaces overload before it becomes a crisis, and
lets a student rehearse a change (a shift, a later deadline, less screen time) before committing to it.
The four Maryville wellness dimensions — intellectual, emotional, financial and physical — are mapped
to features that act on real, self-reported data. Claims stay deliberately modest: Workload Pressure
is a transparent heuristic, screen-time entries are manual, nothing is diagnosed or scored clinically,
and **no data leaves the device**.

---

## What it does

| Area | Capability |
| --- | --- |
| **First run** | Empty workspace, skippable five-step setup (name, study hours, limits, sleep, theme, language, first course, first assignment), and a plain statement that data is local. No fictional student is injected. |
| **Overview** | Computed metrics, weekly workload chart, today's schedule, nearest deadlines and one data-driven insight. Empty state offers real next steps. |
| **Smart Planner** | Two tabs. **Plan**: weekly calendar, task and commitment CRUD, generated study blocks that open their assignment, unscheduled coursework with reasons, conflict detection. **Courses**: full course management. |
| **Courses** | Add, edit, archive, restore and delete courses; name, code, colour, instructor, semester dates. Deleting asks whether to keep (unlink) or delete the assignments. Archived courses are hidden from new assignments but keep their history. |
| **Assignments** | Create, edit, delete, complete and reopen; course reference, priority, deadline calendar, estimated and completed study minutes, description. Every change recalculates the plan. |
| **Commitments** | One-time or weekly recurring events with weekday selection, end date, exceptions, and "this occurrence vs the entire series" editing and deletion. |
| **Simulation Lab** | Build a scenario (extra shift, removed commitment, moved deadline, new duration, reserved rest, different study window, reduced screen time), compare baseline vs simulated schedules, read computed explanations, then apply after confirmation. |
| **Digital Habits** | Manual screen-time entries with categories and filters, totals, daily average, seven-day trend, usage by app and category, plus a discretionary-reduction simulator. |
| **Wellness Insights** | Workload Pressure indicator (0–100) with its full formula, derived observations, daily load breakdown, and the four Maryville wellness dimensions wired to real metrics. |
| **Data** | JSON export, JSON import preview with **merge or replace**, CSV import/export and templates for courses, assignments and commitments, demo load/reset with confirmation, and a confirmed wipe. |
| **Settings** | Planning preferences, light/dark/system appearance, five languages, data management. |

---

## First run and demo data

A new workspace starts **empty** — no courses, no Example 101, no fake charts. Empty states explain
what to do and provide the action. The setup dialog can be skipped. Use a fresh browser profile to replay onboarding; clearing workspace data retains onboarding completion.

The demonstration set (fictional student **Alex Morgan**: four courses, nine assignments, classes,
campus shifts, gym, rest, a week of screen time) is installed only from
**Settings → Load demo data** (or the Overview empty state), always after a confirmation that explains
the replacement. **Reset demo data** regenerates it with dates relative to today.

---

## Getting started

```bash
# Node 22.12+ (acceptance verified on Node 24)
npm ci
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit (strict)
npm run test       # vitest run
npx playwright install chromium # one-time browser setup (Node 22.12+)
npm run test:e2e   # real Chromium student workflows and 30 layout combinations
npm run build      # typecheck + production bundle in dist/
npm run preview    # serve the production build
```

No environment variables are required.

### Deployment

`npm run build` produces a static SPA in `dist/`. `vercel.json` and `public/_redirects` provide the
history fallback for Vercel and Netlify; any static host with an SPA rewrite works. `dist/` and
`node_modules/` are ignored by Git. No credentials are stored in the repository.

---

## How the scheduling engine works

`src/lib/scheduling/engine.ts` is pure and deterministic; it never mutates its inputs. All pages use
it through `useWeekSchedule`, so the planner, overview, insights and simulation cannot disagree.

1. **Recurrence.** Weekly commitments are expanded onto concrete dates for the planned week, honouring
   weekdays, an optional end date and exceptions (`src/lib/recurrence.ts`).
2. **Capacity.** Each day's preferred study window minus sleep and fixed commitments, cut into
   30-minute slots. Slots in the past are never created.
3. **Daily cap.** `min(free minutes, maximum daily study + recovered focus bonus)`.
4. **Scope.** Unfinished work due inside the week plus the next seven days (`SCHEDULING_LOOKAHEAD_DAYS`),
   ordered by deadline, then priority (high → medium → low), then length. Work due the following Monday
   is therefore prepared this week instead of appearing in a list with no blocks.
5. **Placement.** Chronological slot filling. Never after the deadline, never past the daily cap, at most
   90 continuous minutes, with a break of at least the configured minimum between blocks, including assignment changes.
6. **Remaining work.** `estimatedMinutes − completedMinutes` is scheduled and counted as demand.
7. **Reporting.** Later work is shown separately in the planner and excluded from this week’s totals. A final remainder below 30 minutes can use a short block. Anything in scope that does not fit is listed as unscheduled with its remaining minutes and a
   reason (`overdue` or `insufficient-time`). Nothing is silently dropped.

**Granularity:** 30-minute slots, with a shorter final block for remaining work such as 15 minutes. A 90-minute assignment receives 90 scheduled minutes when the week
has room; if only 60 minutes fit, the remaining 30 are reported as unscheduled rather than hidden.

Overlapping commitments are reported as conflicts. Generated study blocks cannot overlap by construction.

---

## What-If simulation

A scenario is an immutable list of operations. `applyScenario` returns a new dataset plus an optional
per-day capacity bonus; the engine runs twice — baseline and simulated — so every comparison number is
computed. Nothing is written until **Apply scenario** is confirmed, and the dialog lists the pending
changes first.

Screen-time reductions are capped at the discretionary minutes actually recorded in the last seven
days. Only whole 30-minute blocks become capacity, and only when the calendar has space. Applying one
replaces any previously allocated bonus instead of stacking, so time is never double-counted.

---

## Workload Pressure

Weights total 100; each factor is normalised to 0–1, weighted, summed and rounded:

| Factor | Weight | Normalisation |
| --- | --- | --- |
| Demand vs capacity | 40 | `clamp(remaining minutes / usable capacity, 0, 1)` |
| Unscheduled coursework | 25 | `unscheduled minutes / required minutes` |
| Scheduling conflicts | 15 | `min(conflicts, 4) / 4` |
| Continuous study | 12 | `min(longest session / 180 min, 1)` |
| Break availability | 8 | `days without a break / study days` |

Bands: **Balanced** 0–33, **Elevated** 34–66, **High** 67–100. This is a planning indicator, not a
medical or psychological assessment; the UI says so and repeats the formula.

---

## Courses, assignments and recurring commitments

- Tasks store a `courseId`; the course name is only a display snapshot. Migration from the previous
  schema derives one course per distinct name, so no existing assignment loses its grouping.
- Deleting a course always opens a choice: keep the assignments and unlink them, or delete them too.
- Archiving hides a course from new assignments while preserving its assignments and history.
- A recurring commitment repeats weekly on the selected weekdays until an optional end date, with
  individual dates skippable. Editing saves either the whole series or just that occurrence (which is
  detached, so other weeks stay unchanged). Deleting asks the same question.

---

## Import and export

**JSON** — export includes courses, assignments, commitments, screen time and preferences, plus a
`schemaVersion`. Import validates the file, previews the counts, and offers **merge** (keeps existing
records, skips duplicate ids, remaps course links) or **replace** (with an explicit warning). Invalid
records are skipped and reported; nothing is written before confirmation.

**CSV** — one file per entity, with downloadable templates and downloadable exports.

| File | Required columns | Optional columns |
| --- | --- | --- |
| Courses | `name` | `code`, `color`, `instructor`, `semesterStart`, `semesterEnd`, `archived` |
| Assignments | `title`, `deadline`, `estimatedMinutes` | `course`, `priority`, `description`, `completed`, `completedMinutes` |
| Commitments | `title`, `start`, `end` | `category`, `notes`, `recurrence`, `weekdays`, `recurrenceUntil` |

Dates accept `yyyy-MM-dd` or `yyyy-MM-dd HH:mm`; weekdays accept `Mon,Wed` or `0–6`. Course references
are matched by name or code, and an unknown course is reported as a skipped row rather than silently
creating a duplicate. Rows are validated before the import is confirmed.

**iCalendar (.ics)** is not implemented. It is listed in the roadmap and in the UI. SENTINEL does not
connect to Google Calendar, Outlook, Canvas or a university portal.

---

## Digital habits

- Entries are manual and labelled as such; SENTINEL never reads device usage.
- Per-app daily goals can be created, edited and deleted; progress uses today’s manual entries and explicitly marks missing data as unknown. Goals persist and travel in JSON backups.
- Daily average uses recorded days, not a fixed seven; the trend covers the rolling week.
- "Discretionary" is `social`, `entertainment` and `other`; education and productivity are preserved.
- Recovered time is hypothetical and is never automatically converted into study time.

---

## Maryville wellness dimensions

The Insights page maps each official dimension to the feature that acts on it, with live numbers:

- **Intellectual** — scheduled vs open assignments and planned study time → Smart Planner.
- **Emotional** — Workload Pressure and unscheduled minutes → Simulation Lab.
- **Financial** — fixed work hours this week and number of shifts → test another shift.
- **Physical** — protected sleep window and break opportunities → rest preferences.

No improvement percentages or clinical claims are made.

---

## Internationalisation

Five locales ship: **English, Français, Español, Português, 简体中文**. Locale files are typed against
the English dictionary, so a missing or extra key fails `npm run typecheck`. Dates and numbers use the
selected locale, and `<html lang>` follows it. Switching language or theme never touches stored data.

Translations were produced during development, not by professional native speakers. A native-speaker
review of tone and domain terms is recommended before public release.

---

## Accessibility and responsiveness

- Labelled controls, visible focus rings, `aria-invalid` with described errors, `aria-live` status.
- The priority control is a `role="combobox"` + `role="listbox"` widget (arrows, Home/End, Enter,
  Space, Escape, tab-out); the deadline field is a calendar grid (arrows, PageUp/PageDown, Enter/Space,
  Escape). Both expand **inline** inside the form, so a modal never treats them as an outside click and
  no scroll container can clip them. Day keys come from local date parts, never UTC parsing.
- Radix dialogs trap focus; destructive actions always confirm.
- Charts expose accessible labels and alternative lists of the underlying numbers.
- Layouts are designed from 320 px upward; wide calendar content scrolls inside its own container.
  `prefers-reduced-motion` disables animation.

---

## Tests

The current suite includes 146 unit/integration tests in 14 files, deterministic generated workloads,
recovery/quota/import validation, goals, simulation isolation and locale checks. Playwright runs real
student workflows against Chromium, with console/runtime errors treated as failures, responsive checks
and axe WCAG scans. Exact commands, final counts and evidence boundaries are maintained in
[`docs/HARDENING_ACCEPTANCE.md`](docs/HARDENING_ACCEPTANCE.md).

Run browser tests against `npm run preview` using `PLAYWRIGHT_BASE_URL` to verify the production bundle.
The production app serves its Inter fonts locally and uses route-level lazy loading. No Google Fonts
request is required.

---

## Demo walkthrough

1. **Settings → Load demo data → confirm** (or the Overview empty-state button).
2. Review deadlines, workload and today's schedule on **Overview**.
3. **Smart Planner** — inspect the calendar, click a generated study block to open its assignment,
   check unscheduled work, then open the **Courses** tab and try archive/delete.
4. **Simulation Lab → Add a work shift**, e.g. Tuesday 17:00–21:00, and compare; then reset.
5. **Digital Habits** — check totals, trend and the reduction simulator.
6. **Wellness Insights** — pressure formula and the four dimensions.
7. Switch theme and language, reload, and confirm the data is unchanged.

A judged script is in [`docs/HACKATHON_DEMO.md`](docs/HACKATHON_DEMO.md).

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — layers, data model, algorithm, persistence.
- [`docs/DEVELOPMENT_LIFECYCLE.md`](docs/DEVELOPMENT_LIFECYCLE.md) — planning, changes, testing and AI assistance.
- [`docs/HACKATHON_DEMO.md`](docs/HACKATHON_DEMO.md) — three-minute presentation.
- [`docs/HARDENING_ACCEPTANCE.md`](docs/HARDENING_ACCEPTANCE.md) — current acceptance matrix, fixes and release classification.
- [`docs/INDEPENDENT_AUDIT.md`](docs/INDEPENDENT_AUDIT.md) — independent regression fixes and browser verification.
- [`docs/RELEASE_AUDIT.md`](docs/RELEASE_AUDIT.md) — what was verified, how, and what remains.
- [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) — unsupported and unverified behaviour.
- [`docs/CODEX_HANDOFF.md`](docs/CODEX_HANDOFF.md) — architecture, commands and prioritized next tasks.

---

## Project structure

```
src/
  components/
    common/       page header, cards, empty states, confirm dialog
    dashboard/    metrics, workload chart, today, deadlines, insight
    planner/      task, commitment and course dialogs, calendar, lists, courses
    simulation/   scenario builder, pending changes, comparison, chart
    habits/       entry dialog, table, charts, reduction simulator
    insights/     pressure card, insight list, wellness dimensions
    onboarding/   first-run wizard
    settings/     JSON/CSV data manager
    layout/       sidebar, header, mobile drawer, app shell
    ui/           button, card, field, select, date picker, dialog, tabs, switch, toast
  hooks/          app store, weekly schedule, locale formatters
  lib/
    scheduling/   deterministic engine
    simulation/   immutable scenarios and comparison
    analytics/    habits, workload pressure, insights
    storage/      typed persistence, validation, migration, demo data
    io/           CSV parsing, validation, templates
  locales/        en, fr, es, pt, zh-CN
  pages/          overview, planner, simulation, habits, insights, settings
  tests/          unit + integration tests
  types/          shared domain models
```

---

## Known limitations

- Data is local to one browser profile. Export/import is the manual sync path; there is no account or
  server backup.
- Schedules are Monday-based. Work due after the seven-day look-ahead is planned when its week is viewed.
- Study sessions are generated chronologically and cannot be dragged on the calendar; editing a task or
  its preferences is the supported way to change them.
- Weekly recurrence only; no monthly/yearly rules and no iCalendar (see roadmap).
- Workload Pressure is a transparent heuristic, not a validated instrument.
- Screen-time entries are self-reported; there is no device integration by design.
- The four non-English locales have not had native-speaker review.
- Settings provides raw corrupt-data backup downloads, validation and a confirmed merge recovery flow.
- The full list is in [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md).

Latest release-candidate evidence: [Final release verification](docs/FINAL_RELEASE_VERIFICATION.md)
(150 unit/integration tests, 27 production Chromium tests; exact tested commit and limitations recorded).
