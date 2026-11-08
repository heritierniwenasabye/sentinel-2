# SENTINEL 2.0 — Current supported boundaries

Current acceptance evidence is in [FINAL_RELEASE_VERIFICATION.md](FINAL_RELEASE_VERIFICATION.md). Earlier audit
reports describe earlier commits and must not be used as the current defect list.

- Data is local to one browser profile and origin. There is no account, server backup, automatic sync,
  phone monitoring or third-party calendar connection. Export JSON before clearing browser data.
- A failed storage write keeps the current session usable and displays a warning. Export the in-memory
  data before reloading; a reload can recover only the last successful write.
- Recovery preserves raw damaged data, offers exact-byte downloads, validates before confirmation,
  exports the current workspace and merges valid records without overwriting existing IDs. A payload
  that is not parseable SENTINEL JSON needs manual repair outside the app; it cannot be automatically
  reconstructed. Raw backups remain on the device and may contain personal data.
- JSON and CSV uploads are limited to 5 MiB and 10,000 records per file. JSON is the complete backup
  format, including usage and goals. CSV handles courses, assignments and commitments; it is not a
  full-workspace backup. Validation errors and skipped duplicates are shown before confirmation.
- The planning week is Monday–Sunday. Demand includes the following seven days; later assignments
  stay visibly unfinished in a separate section. A final remaining amount below 30 minutes can now be
  scheduled as a short block. Starts otherwise follow the existing scheduling slots.
- The chronological scheduling heuristic is deterministic, not an optimal packing solver. Free-slot
  capacity is an upper bound: deadlines and required breaks can prevent all of it being used.
- Weekly recurrence only. Monthly/yearly recurrence, iCalendar import/export, travel time, task
  dependencies and dragging generated study sessions are unsupported and are not presented as working.
- Times are local wall-clock values. JavaScript resolves nonexistent spring-forward times forward and
  repeated fall-back times to its default occurrence; there is no offset-choice UI. Tests cover both
  2026 America/Chicago transitions, UTC and a fractional-offset zone, not every timezone rule.
- Clock-dependent plans refresh every minute and on focus/visibility changes. The planner preserves
  the week the student chose; “This week” navigates to the current week.
- Usage goals are daily per-app limits, calculated from manual entries for today. Missing entries mean
  unknown usage, not zero. Reductions are hypothetical; allocating capacity requires an explicit action.
  Multiple reduction operations use the latest reduction, preventing double-counting. Saved focus
  bonuses remain until changed and are never evidence of actual recovered time.
- Workload Pressure is an explained planning heuristic, not a clinical or psychological instrument.
- English, French, Spanish, Portuguese and Simplified Chinese have key/interpolation parity checks.
  Native-speaker review and screen-reader certification have not been performed.
- Chromium production-build workflows and automated WCAG scans are verified. Cross-browser Safari/
  Firefox, assistive technology and a real hosted preview are not verified in this environment.
- There is no service worker or offline installation. All fonts and assets are served locally, but
  a fresh navigation still requires access to the static host.
- Node 22.12+ is required for the updated toolchain; Node 24 was used for acceptance. Recharts 2 is
  deprecated upstream but has no advisory in the captured audit; migrating its major API is deferred.
