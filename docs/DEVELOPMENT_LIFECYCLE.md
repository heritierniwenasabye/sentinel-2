# SENTINEL 2.0 — Development lifecycle

This document records what actually happened. It does not claim user interviews, external testers or
integrations that never existed.

## 1. Problem definition

The target student is a full-time undergraduate with a part-time job, several courses and a phone.
Their week is not short of deadlines; it is short of *feasible time*. Existing planners accept any
commitment and only reveal the collision later. SENTINEL's premise: make the collision visible
**before** the student accepts it, and connect that decision to Maryville's wellness dimensions.

## 2. From prototype to working application

The project began as a React/Vite interface with a demo dataset. The first review found that several
surface features were not trustworthy:

- the priority control was a native `<select>` with `appearance-none`, whose only behaviour was the
  operating-system popup — it had no testable JavaScript path;
- the deadline field was a native `datetime-local` input inside a scrollable modal, which could be
  clipped and which round-tripped through UTC;
- the scheduler used the end of the displayed week as its horizon, so work due on the following
  Monday appeared in the deadline list but produced no study blocks and no unscheduled warning;
- the demonstration dataset was the only realistic content, and course grouping was a free-text field.

Each was treated as a root cause, not a styling problem.

## 3. What changed in this phase

| Area | Change | Why |
| --- | --- | --- |
| Form controls | Custom accessible listbox and calendar grid, rendered inline inside dialogs | Removes OS-popup dependence, clipping and UTC day shifts; both are keyboard operable and unit-tested |
| Scheduling | Seven-day look-ahead and `completedMinutes` subtracted from demand | Work due next week is prepared now; partially finished work is not scheduled twice |
| Courses | `Course` entity, `courseId` on tasks, create/edit/archive/restore/delete with a keep-or-delete choice, Courses tab in the planner | Grouping by id instead of a string, and destructive actions can never silently remove assignments |
| Recurrence | Weekly series with weekday selection, end date, exceptions, series-vs-occurrence editing and deletion | Real timetables repeat; one-off rows made the plan decay after a week |
| First run | Empty workspace by default, skippable five-step onboarding, explicit demo loading with confirmation and reset | No fictional student is injected into a real student's workspace |
| Import/export | JSON preview with merge/replace and duplicate reporting; CSV import/export and templates for courses, assignments and commitments | Portability without a server, and validation before anything is written |
| Wellness | Four Maryville dimensions computed from the same schedule | Connects the rubric language to features that actually act on it |
| Empty states | Purposeful copy and working actions on overview, planner, courses and habits | A new student always has a next step |

## 4. How AI assistance was used

Development was AI-assisted. A coding agent read the existing repository, proposed the data-model
change, wrote most of the code and tests in this phase, and ran the checks. A human directed the
scope, defined the acceptance criteria (for example "a 90-minute assignment must receive 90 valid
minutes, and any shortfall must be reported"), reviewed the diffs and made the product decisions about
what to leave out. No AI-generated test result or screenshot in this repository was fabricated; failed
runs were fixed rather than hidden.

## 5. Testing methodology

- **Unit tests** for the pure layers: scheduling, recurrence expansion, simulation isolation, storage
  validation and migration, CSV parsing, habit maths, pressure bounds, translation parity.
- **Integration tests** that render the real dialogs, select priority and a calendar day, submit the
  form, then read the persisted task and run the scheduler against it.
- **Static checks**: `tsc --noEmit` in strict mode; locale dictionaries typed against English.
- **Production build** on every verification round.
- **Manual browser pass** at 432 px (and wider breakpoints where noted) for the flows a headless test
  cannot judge: dropdown geometry, calendar clipping, theme, language switching, persistence after a
  reload, and the simulation comparison.

Playwright could not run in this build environment, so there is no committed end-to-end suite. This is
stated in the README rather than implied otherwise.

## 6. Defects found during this phase

- The existing workflow test typed a course name into a field that had become a course listbox; it was
  updated to select a real course and now also asserts the `courseId` link.
- The recurrence tests initially assumed an inclusive window end; the implementation uses a half-open
  window (`[start, end)`), which matches the week boundary. The tests were corrected, not the semantics.
- One assertion wrongly assumed a day with a morning class had no study time at all; it was narrowed to
  "no study block overlaps the class".
- `importedWithErrors` used `count` twice, which collided with i18next pluralisation; it now uses
  explicit `imported`/`skipped` parameters.
- The planner header counted only assignments due in the displayed week, so a demo week could read
  "2 of 2 assignments scheduled" while seven were listed as unscheduled. The total now includes
  unscheduled work inside the planning horizon.
- Two strings misdescribed computed state: the task row's "min remaining" meant "still to schedule"
  (now "min unscheduled"), and the simulation chart said "no study blocks" when it meant no difference
  between the plans. Both were corrected in all five locales.

## 7. Known limitations

- Weekly recurrence only. Monthly/yearly rules, iCalendar import/export and calendar subscriptions are
  on the roadmap, not implemented.
- Study sessions are generated chronologically; there is no drag-to-reschedule on the calendar, by
  design (editing a generated block silently would create hidden conflicts).
- Data is per browser profile. There is no account, server sync or automatic backup.
- Workload Pressure is a transparent heuristic, not a validated instrument.
- French, Spanish, Portuguese and Simplified Chinese copy was written during development and has not
  been reviewed by native speakers.
- Browser breakpoints above 432 px are verified by layout review and responsive CSS; only some widths
  were exercised in a real browser.

## 8. Roadmap

1. iCalendar import/export (weekly + single events) and a documented unsupported-pattern list.
2. Native-speaker review of the four non-English locales.
3. Optional encrypted file backup/restore.
4. Study-session rescheduling with explicit conflict resolution.
5. Accessibility audit with a screen reader, and a Playwright suite in CI.
