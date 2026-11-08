# SENTINEL 2.0 — Current engineering handoff

Continue on `audit/independent-release-review`, PR #1. Do not merge or deploy without owner approval.
The starting release was `98d72ca`; the initial independent audit was `8a3bb26`. The current hardening
results, acceptance matrix and exact changed-file list are in [HARDENING_ACCEPTANCE.md](HARDENING_ACCEPTANCE.md).

## Stack and commands

React 18, strict TypeScript, React Router 7.18.5, Vite 8.3.6, Vitest 5.1.0, Tailwind 3, Radix,
Recharts 2, date-fns, i18next, Playwright and axe-core. Node 22.12+; acceptance used Node 24.

```bash
npm ci
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
# System Chromium / production preview:
npm run preview -- --port 3010
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
npm audit
npm audit --omit=dev
```

Development/preview servers bind to loopback. Explicit `--host 0.0.0.0` and the existing
`SENTINEL_PREVIEW_HOST` allowlist remain available for an authorized shared preview.

## Architecture and invariants

`AppProvider` owns the immutable dataset and persists mutations. Keep the storage key
`sentinel.v2.data`, schema/version 3 and migrations. `usageGoals` is an optional schema-3 extension;
older files load it as an empty array. All exported JSON includes it. Course links use stable IDs.

All scheduling views use the same pure engine. It walks slots chronologically, respects fixed events,
sleep, daily capacity, deadlines and breaks across task boundaries. Final remainders can be shorter
than 30 minutes. Planned plus unscheduled equals eligible remaining demand. Later work is displayed
separately. `useClock` refreshes on a minute interval and focus/visibility return; all date-derived
views subscribe. Preserve explicit `now` for deterministic tests.

Weekly expansion includes overnight carry-in and preserves calendar-day span and wall-clock end
times across DST. Series edits use the original anchor; occurrence edits detach only that date.

Simulation is immutable. Confirmation commits. The latest screen-time reduction replaces earlier
ones, capacity overrides replace saved bonuses, and lowering an estimate clamps completed progress.

Storage validation reports bad/duplicate records. Partial or unreadable storage is backed up verbatim.
A write refuses to overwrite damaged primary data if its backup cannot be safely stored; existing
recovery evidence is never overwritten by a different damaged payload. Settings exposes raw downloads,
validation, confirmed non-destructive merge and a pre-merge current-workspace export. Failed writes
keep data in memory with a visible warning. `parseImport` and CSV enforce 5 MiB/10,000-record limits;
local datasets are not silently truncated to those upload limits.

Usage goals are per-app daily limits based on manual logs. `goalProgress` returns explicit unknown
status when today's entry is absent. Goals never monitor devices or allocate study time automatically.

## Tests and future work

See the acceptance matrix for exact results and evidence boundaries. Keep the generated invariant
workloads, DST runs, failed-write tests, realistic mobile journey, browser console-error fixture and
WCAG route/dialog scans. App pages are lazy-loaded; fonts are local. A page boundary offers recovery
if loading/rendering fails, without deleting data.

No known P0/P1 is accepted merely because it is documented. Unsupported integrations remain clearly
labelled. External hosting verification, native-speaker review and screen-reader/cross-browser review
remain separate acceptance tasks; do not claim they occurred.
