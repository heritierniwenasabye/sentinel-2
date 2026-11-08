# SENTINEL 2.0 — Known limitations

This file lists what is **not** implemented, what was **not** verified, and where the
application's behaviour has deliberate boundaries. It is written to be accurate for a handoff, not
flattering.

## Data storage

- All data lives in `localStorage` under `sentinel.v2.data` for one browser profile and origin.
  There is no account, server, cloud sync, or automatic backup.
- Clearing site data, using private browsing, or switching browser/profile loses the workspace unless
  the student exported JSON first.
- A payload that fails validation or JSON parsing is copied verbatim to `sentinel.v2.data.corrupt`
  before the app starts empty, but **there is no UI to restore it**. Recovery requires devtools or an
  export from another source.
- JSON uploads have a 5 MiB file-size guard. CSV imports have no size cap; neither format has a record-count cap or streaming parser.
- The JSON export contains the optional display name and all entered data in plain text. It is not
  encrypted.
- No storage-quota handling beyond a warning banner when a write fails; the in-memory session keeps
  working but changes will not survive a reload.

## Scheduling

- Granularity is 30 minutes, the planning week starts Monday, and the look-ahead is seven days.
  Work due further out is planned when its week is viewed.
- Study blocks are never placed in the past, never after a deadline, and never past the daily cap.
- Continuous study is capped at 90 minutes before a break of at least the configured minimum.
- Weekly recurrence only. Monthly/yearly rules, term patterns (e.g. "every other week"), and
  iCalendar (`.ics`) import/export are not implemented.
- Generated study sessions cannot be dragged or manually moved on the calendar. The supported way to
  change them is to edit the assignment, its deadline, its remaining minutes, or the planning
  preferences.
- No travel time, task dependencies, or per-assignment preferred times.
- Datetimes are stored as local wall-clock ISO strings without an offset. Moving to another time zone
  keeps the wall-clock time, not the absolute instant. DST transitions are handled by local date
  arithmetic. Independent regression tests cover both 2026 DST transitions in America/Chicago; other transition rules and ambiguous/nonexistent local times are not exhaustively tested.
- A day whose preferred study window would wrap midnight is rejected by the preference normaliser;
  study windows must start and end on the same day.

## Simulation Lab

- Compares the **currently displayed week** only; multi-week effects are not simulated.
- Supported operations are adding/removing a commitment, changing a task's deadline or duration,
  changing the study window, reserving rest, and reducing screen time. Anything else is out of scope.
- Screen-time recovery is capped at discretionary minutes recorded in the last seven days and rounded
  down to whole 30-minute blocks. It is never converted into study minutes automatically.
- "Apply scenario" writes immediately after confirmation. There is no general undo; the changes are
  ordinary records that can be edited or deleted.
- Applying a screen-time scenario replaces the stored per-day focus bonus rather than stacking it.

## Wellness and analytics

- Workload Pressure is a transparent heuristic with published weights. It is **not** a validated
  psychological or clinical instrument, and the UI says so.
- The four Maryville dimensions are mapped to product features and computed metrics; no improvement
  percentages, clinical outcomes, or research claims are made.
- Screen-time entries are self-reported. There is no device, OS, or app-usage integration, and the app
  does not claim one.

## Imports and exports

- JSON import validates record-by-record. Invalid records are skipped and reported; a file with no
  valid SENTINEL data is rejected as a whole.
- Merge keeps existing records, skips duplicate ids and duplicate course names, and remaps course
  references for the records it adds. Replace overwrites the workspace after confirmation.
- CSV import supports one entity per file and accepts `yyyy-MM-dd` or `yyyy-MM-dd HH:mm`. Unknown
  course references are row errors, not auto-created courses. Only `true`/`false` (case-sensitive)
  is recognised for boolean columns.
- No XLSX, Google Sheets, Canvas, or university-portal integration exists.

## Interface and internationalisation

- Five locales ship (en, fr, es, pt, zh-CN). Dictionaries are type-checked and key-parity tested, but
  **none of the non-English copy has been reviewed by a native speaker**. Domain terms may read
  literally.
- Some forms still use native date/time inputs (commitment dialog, simulation builder, habits entry)
  alongside the custom calendar and listbox. Behaviour depends on the browser's picker.
- At phone widths the weekly calendar, habits table, and simulation scenario tabs scroll horizontally
  inside their own containers. Page-level horizontal overflow is zero at 320–1440 px, but those
  regions are not redesigned into stacked layouts.
- Charts expose accessible labels and a text table, but there has been no screen-reader audit with
  NVDA/JAWS/VoiceOver.
- Motion respects `prefers-reduced-motion` only where animations are defined in CSS.

## Verification gaps

- No end-to-end suite is committed. Playwright is unavailable in the build environment
  (`options.mode must be one of: 'strip'`), so browser checks were performed manually through the
  preview browser and a temporary same-origin layout harness (removed from the repository).
- Layout was measured at 320, 375, 768, 1024 and 1440 px in Chromium; Safari, Firefox, and real mobile
  devices were not tested.
- Theme switching, language switching, JSON/CSV parsing, scheduling, recurrence, simulation
  immutability and course/assignment flows are covered by unit/integration tests; browser interaction
  tests of every dialog are not.
- Dependency vulnerability status depends on the registry; run `npm audit` in the target environment.
  No automatic upgrades were applied during the audit.

## Deployment

- The build is a static SPA and requires a rewrite of unknown paths to `index.html`
  (`vercel.json` and `public/_redirects` are included).
- No server-side rendering, no PWA/offline service worker, no crash reporting, no analytics.
- Nothing in this repository is deployed or published by the audit; no credentials are included.

## Independent audit update

See [INDEPENDENT_AUDIT.md](INDEPENDENT_AUDIT.md) for this branch’s verified results and remaining gaps.
Persistent digital-usage goals are not implemented; reduction amounts are scenario inputs. The schedule
hook recomputes on data/week changes, not continuously as the clock advances; refresh a long-lived
tab before a live demo. Google Fonts is an external request; core data processing is local.
