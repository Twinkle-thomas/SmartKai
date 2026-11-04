# Weekly reminder routines

SmartKai's optional reminder routine is at `#/reminders`, with a setup prompt on signed-in application pages when no preferences have been saved. It does not block registration or the questionnaire. Users choose any convenient weekday (including their day off) and a time for each task: plan upcoming meals, prepare for shopping, check use-first food and review leftovers. All are disabled by default. Saving with everything off is a valid choice and stops the initial setup prompt.

Preferences are stored per evaluator account in `public.reminder_preferences`. Migration `20261103093941_reminder_preferences.sql` was applied to the connected SmartKai database through SQL; preserve it for a fresh setup and do not reapply it blindly. The composite primary key `(owner_id, task_key)` permits one routine per supported task and indexes owner lookups. Database constraints validate tasks, weekdays, HH:MM time, fixed Pacific/Auckland timezone and the fictional-data flag. Four owner-scoped RLS policies protect CRUD, including UPDATE WITH CHECK. Anonymous privileges are revoked. Saving all four preferences uses a single upsert; dismissals verify a returned row. No existing assessments, profile rules or other records are changed.

## Delivery behaviour

- A quiet, accessible in-app alert appears on signed-in application pages when a saved routine becomes due. The clock is checked every 30 seconds and on focus/visibility return. Browser timer throttling means this is not an exact alarm service. Overdue reminders appear when the user next opens an application page; only the most recent weekly occurrence per task is shown.
- Saving a routine starts it from the save time, so earlier occurrences are not immediately reported as overdue. A dismissal is saved for that account and suppresses occurrences up to that time; the next week can appear again. Dismissing an alert or opening a tool does not record action completion, behaviour change or reduced waste.
- Times use Pacific/Auckland even if the device is in another timezone. Weekly local time is maintained across contemporary NZ daylight saving: spring's missing time shifts forward an hour, autumn's repeated time uses its first occurrence. Chatham Islands and other timezone choices are not supported in this increment.
- A preview alert demonstrates the UI without altering saved preferences or acknowledgements.
- Alerts point to existing meal-planning, shopping, pantry, use-first and leftover views. Dedicated meal and shopping tools are now available in subsequent increments.

## Phone-calendar option

Download calendar reminders exports enabled **saved** preferences to a locally generated `.ics` file: weekly recurrences, explicit Pacific/Auckland VTIMEZONE information and display VALARM requests. The user imports the file into their own calendar and enables its alerts. The export contains task descriptions and schedule times, not account identifiers, authentication tokens or household records. It does not connect to or write into a calendar account automatically.

Imported events are separate copies: changes or disabling reminders in SmartKai do not update an earlier import. The user must edit/delete imported calendar events and avoid duplicating imports. A phone's calendar controls delivery and may ignore imported alarm requests, so actual phone notification delivery must be checked on the target device. No email, Web Push, service worker, background scheduler, audible alarm or always-on notification delivery is claimed by the web application.

The calendar format follows [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html). Browser timer constraints are documented by [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#reasons_for_delays_longer_than_specified). Persistence uses Supabase's [upsert](https://supabase.com/docs/reference/javascript/upsert) with owner-scoped RLS.

## Evaluation

Use fictional evaluator routines. Automated tests cover opt-in defaults, choosing days/times, disabling reminders, preview, alert at its due time, catch-up, dismissal/reload, the next week, NZ DST/midnight, calendar content, API errors, and owner/anonymous database isolation. A full mobile calendar import and OS notification check is a manual device check, not established by unit tests. Existing profile scenarios and assessment tests are preserved.
