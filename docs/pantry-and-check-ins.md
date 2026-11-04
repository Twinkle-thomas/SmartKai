# Pantry and monthly check-ins

This increment extends the existing application; it does not change the provisional profile rules, assessment snapshots, evaluator authentication or explicit Save assessment behaviour. Use synthetic household data only when evaluating it.

## Working workflow

1. Sign in, answer all five questions and save an assessment. Consider the past 30 days consistently.
2. Follow the recommended internal tool links. Pantry (`#/pantry`) supports add/edit/delete, quantities and units, dates and their types, storage locations and notes, leftover marking and a manually selected use-first flag.
3. Use-first (`#/pantry/use-first`) and leftovers (`#/pantry/leftovers`) open filtered views. All profiles have a practical pantry action, but pantry alone does not implement every recommendation: shopping lists and the manual weekly meal planner are now available in later increments. Those limitations are shown with the recommendations and dashboard.
4. Open Monthly check-in (`#/progress`). The first saved assessment with `scenario_key IS NULL` is the baseline; the latest such assessment is compared with it. Example fixtures do not enter this comparison. Queries fetch oldest/latest independently, so comparison is not limited to the 50-item history view.
5. Thirty days after the latest saved household assessment, an in-app prompt is due. A fresh check-in clears the unsaved questionnaire state and opens all five questions. Saving creates another immutable snapshot. Early check-ins are allowed and labelled. Continue monthly to assess one-, two- or three-month intervals. No email, scheduler, background task or push notification is implemented.

The five ordinal answers are summed to a provisional descriptive score from 0 to 10. Lower means fewer reported waste-related habits. Show starting/latest answers, point differences, actual elapsed days and dates. Do not label the difference a percentage reduction in waste. Questionnaire change and tool usage do not establish measured waste reduction, causality or effectiveness. A separate defined waste-measurement protocol and ethics approval would be needed for participant research. Records from incompatible rule versions cannot be compared.

## Storage and access

`supabase/migrations/20261103092654_pantry_inventory.sql` adds `public.pantry_items`. It uses `owner_id` referencing `auth.users`, rather than the existing `households.id` which represents a fresh assessment snapshot on each save. One evaluator account represents one prototype household inventory. Fields: UUID, food name, positive quantity, unit, storage location, optional typed date, use-first/leftover booleans, bounded notes, immutable creation timestamp and fictional-data constraint. Four RLS policies restrict CRUD to the owner, including UPDATE WITH CHECK to prevent reassignment; anonymous access is revoked. The `(owner_id, created_at)` index supports inventory retrieval. Each mutation verifies a returned row instead of silently reporting success for a blocked update/delete.

The migration was applied to the connected SmartKai project through SQL. Its script is preserved for reproduction; do not blindly reapply it to that project. No existing records or assessment schemas were changed. CLI migration history was not altered. Apply the original assessment migration followed by this new migration when setting up a clean database.

Pantry lists show up to 500 entries per account. Dates are manually recorded and sorted; use-first priority is manually selected, not a safety prediction. Follow food packaging instructions. No barcode lookup, generated safety deadline, automated meal suggestion, cross-household sharing or waste-quantity logging is implemented. Free text must contain synthetic examples in academic evaluation; a database flag cannot detect real household data.

Hosted verification confirmed RLS enabled, four owner policies, authenticated CRUD and no anonymous SELECT. An authenticated insert/update/delete smoke test was rolled back. Security advisors reported no new pantry finding. Existing project advisories remain for [exposed security-definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); this increment did not alter those functions or Auth settings.

## Evaluation examples

Use existing multiple-profile and single-profile fixtures to check internal actions. Add synthetic carrots (500 g, fridge, a best-before date), mark use-first, edit to 250 g, filter, then confirm deletion. Add synthetic soup as a leftover with a prepared-on date and a storage note. Verify persistence after refresh and isolation with a second evaluator.

For monthly simulations, unit tests use a fixed January baseline of `[2,2,2,2,2]` and a February follow-up of `[0,1,0,1,0]`: 10 → 2 points across 31 days, described only as an 8-point lower reported habit score. Tests also cover unchanged/increased scores, early check-ins, the exact 30-day boundary, invalid dates/quantities, unsupported rule versions, missing baseline, database constraints and two-account RLS CRUD. Do not backdate live assessment records to simulate elapsed time.
