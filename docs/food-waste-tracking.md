# Food Waste Tracking and Progress Dashboard

## Smallest reliable implementation

The existing pantry/leftover lifecycle already supports atomic partial outcomes, whole-entry archival, and an append-only `inventory_events` ledger. The questionnaire progress page reports habit scores, not waste quantities. This increment preserves that page and all five provisional classification rules, and adds `#/waste` as a separate tool.

Extend the single event ledger instead of introducing a second discard table. Add an explicit discard date, category snapshot, optional notes, operation ID and request payload. Store the explicitly selected baseline Monday in `waste_baselines`. No assessment/profile schema changes are needed.

Implementation order: calculations/fictional scenarios → additive migration and transactional tests → history service and dashboard → pantry/leftover integration → UI tests and full regression/build → hosted migration and deployment verification.

## Data and lifecycle

- Standalone log fields: discard date, food name, category, amount, unit, reason and optional notes. Date is a NZ calendar date, not inferred from a browser timezone. Future dates, missing fields, non-positive amounts and more than three decimal places are rejected.
- Linked pantry/leftover discards snapshot the food name/category/unit, write one Discarded event and subtract the specified quantity in one database transaction. Full discards archive the source entry; partial discards preserve remaining stock. Unrelated stock is untouched.
- An owner-scoped unique operation ID and transaction-scoped advisory lock serialise retries. An identical retry returns the original event; reuse with changed details fails. The UI locks the pending payload and offers an unchanged retry on an uncertain response. This covers double clicks and retries of that operation, not two independently entered reports of the same real-world event. Pending IDs are held for the mounted form; after a reload, review history before re-entering an uncertain submission.
- Pantry/leftover status dropdowns no longer offer Used/Discarded as new selections; use the item’s outcome action to capture quantities/history. Frozen remains available. Prior records and prior status values are retained. This is UI guidance, not a prohibition on all direct authenticated database writes.
- The dashboard queries Discarded events only, never copies them. Used events, planned meals and consumed leftovers are not “avoided waste”. Deleting a pantry item does not delete historical event snapshots.
- Existing events retain their IDs and quantities. Their date is the original `created_at` converted to Pacific/Auckland; category is Other because category at the historical discard time is unknown. `legacy_metadata` identifies these rows. Older archived statuses without events are not fabricated into measured waste.
- Events have no ordinary update/delete grants; this increment does not provide corrections or deletion. Baseline selection is user-editable and persistent; historical event logs remain unchanged.

## Units and interpretation

Only exact SI mass relationships are used: kg ×1, g ÷1000, mg ÷1000000. Unit matching ignores case and surrounding spaces. No conversion is made from items, portions, bags, litres, millilitres or arbitrary units; these appear as unmeasured in kg. No density or average item/serving weights are estimated. Displayed mass is reported by the household, not independently verified measurement.

The eight-week trend includes the current partial week and explicitly labels it as such. Weeks run Monday–Sunday. Weeks without logs say No logs, with no kilogram total; this is not a zero-waste observation. Mixed-unit weeks show the recorded mass subtotal and unmeasured log count separately. Categories and reasons are grouped for the selected comparison week; amounts in incompatible units are not combined.

Baseline comparison uses an explicitly selected and saved seven-day week and a separate seven-day comparison week. Both must be completed, non-overlapping and contain discard logs entirely in supported mass units. Percentage = (comparison kg − baseline kg) ÷ baseline kg ×100. Empty periods, unmeasured quantities, overlapping/incomplete periods and zero/unavailable baselines suppress percentages. Even two eligible weeks may differ in logging completeness; the interface states this limitation. Changes in recorded mass do not establish real household waste reduction or causation by SmartKai.

Optional reason-based advice links to existing tools and research categories. It never assigns a profile or changes the five-question rule module. Custom/legacy reasons without a predefined mapping simply receive no automatic advice.

## Simulated evaluation data

The dashboard selector offers explicitly labelled simulated examples. They are bundled fictional data and never saved to household accounts:

| Example | Baseline 5–11 October 2026 | Comparison 12–18 October 2026 | Expected change |
| --- | --- | --- | --- |
| Decreased | 1kg | 0.5kg | −50% recorded mass |
| Increased | 1kg | 1.5kg | +50% recorded mass |
| Unchanged | 1kg | 1kg | 0% |

## Authentication and database

Migration: `supabase/migrations/20261106111311_food_waste_tracking.sql` (filename matches hosted migration history). The new RPC and trigger are SECURITY INVOKER with an empty search path and no anonymous execute grants. Existing authenticated ownership RLS applies to inventory events, including linked pantry/meal ownership checks. Baseline select/insert/update policies require `auth.uid() = owner_id`, with update USING and WITH CHECK. Indexes support owner/date history reads and owner/operation uniqueness.

Before/after hosted migration check: one existing inventory event, zero discards, both counts unchanged. Baseline RLS enabled; discard RPC verified SECURITY INVOKER. Security advisors show the same pre-existing automatic-RLS/assessment function and leaked-password notices, with no new function advisory. Their remediation guidance remains in the earlier reliability audit; these are not fixed or security-certified by this feature.

The service paginates in 500-row pages rather than silently using a server-limited total. A failed fetch shows an error and suppresses totals rather than becoming an empty/zero period. Very large histories may warrant server-side aggregation later; concurrent edits during multi-page fetches are not a repeatable-read snapshot.

## Verification

- Calculation tests: SI units, missing/invalid inputs, unknown units, mass-only summaries, exclusion of Used events, DST/year/week boundaries, mixed measurements, incomplete/overlapping/empty/zero-baseline safeguards and all three simulated changes.
- Database tests: migrate legacy events; partial and whole discards; idempotent retries and changed-payload rejection; overdraw/unit/reason failures; preservation of unrelated stock; event snapshot survival after source deletion; append-only permissions; account isolation and anonymous denial; baseline persistence; dump/restore of saved history.
- UI/service tests: explicit baseline save/reload; standalone and linked unchanged retries; simulated modes cannot save; no signed-out log form; failed loads suppress totals; history reload; owner/date/outcome query scoping and pagination. Existing disposal test now checks the new atomic discard RPC; original Used/meal/shopping functionality remains under regression tests.
- Full regression: 185 passed (20 Node/domain/database + 165 Vitest tests across 32 files). Production build passed. Automated DB isolation uses a local Postgres-compatible test environment, not two independently signed-in browser accounts.

Sources consulted: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase changelog](https://supabase.com/changelog). This increment uses no new package dependencies.

## Production browser checks — 7 November 2026, NZ time

Application commit `15e8920` deployed Ready at `smartkai-nt6flwfpw-twinklethomas-projects.vercel.app`, aliased to `https://smartkai.vercel.app`. The existing authorised demonstration browser session restored successfully. These checks used normal application controls and new recognisable fictional QA records; existing records were left intact.

| Check | Expected | Observed | Result |
| --- | --- | --- | --- |
| Standalone log | 250g recorded once as 0.25kg | `COMP903 QA Waste Apple` saved with date7 November, Fruit, reason/notes and one history entry; weekly trend0.25kg | PASS |
| Linked leftover discard | 200g removed from1000g, one history entry | New `COMP903 QA Waste Soup` created at1000g; Leftover Manager discard left800g; shared dashboard adds one200g/0.2kg event | PASS |
| Preservation | Existing pantry records unchanged | Previously present10 items remain alongside the new stock; Rice400g, Soup2portions and Apples4items retained | PASS for observed records |
| Refresh / baseline |800g stock, two logs and baseline retained | Leftover refresh retained800g; returning to dashboard loaded two events totalling0.45kg and saved baseline26 October | PASS |
| Partial-week guard | No percentage for incomplete comparison week | Selecting2 November shows “Compare completed seven-day periods only” | PASS |
| Simulated cases | Decreased−50%, increased+50%, unchanged0%; no account writes | All three selectors showed expected recorded-mass messages and explicit simulated labels | PASS |

Evidence: local screenshots `.vercel/qa-waste-dashboard.jpg` (explicitly simulated dashboard and weekly comparison), `.vercel/qa-waste-full.jpg` (full simulated dashboard). QA stock/history remain for repeatable demonstrations. Uncertain-response retries, concurrent operations and two-account RLS were covered by automated tests, not induced against production in this browser run. New-login persistence of this feature still needs a logout/sign-in pass; full-page refresh is the observed persistence check here.
