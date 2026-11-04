# Shopping-list increment

`#/shopping` provides one saved active shopping list per evaluator account. Users add/edit names, positive quantities, units and optional notes; mark/unmark purchases; switch To buy/Purchased/All items views; and confirm individual deletion. Saves persist through Supabase using the current authenticated session. Refresh and mutation failures remain separate from successful local edits, and blocked updates/deletes cannot silently report success.

The companion pantry view loads independently, supports name search, and shows recorded stock quantities and locations. As a user enters a shopping name, exact pantry-name matches are shown after whitespace/case normalization. This is an advisory match, not semantic matching: different spellings, plurals and brands are not equated, units are not converted, stock is not subtracted and no purchase quantities are generated. A pantry load failure explicitly does not mean food is absent. Both list and pantry views show up to 500 records; records can be stale and are refreshed manually.

Marking a shopping item purchased does not add it to pantry or establish food-waste reduction. Users separately confirm actual quantities, storage locations and dates in Pantry. There is no checkout/payment, pricing, retailer integration, automatic replenishment, shared household editing, offline synchronization, multi-list management or meal calendar in this increment.

Overbuyer and planning-related recommendation actions now open shopping lists. Shopping reminders open this working route. Homepage and dashboard availability labels were updated; illustrative homepage previews remain clearly separate from saved data. Meal planning and dedicated leftover/storage guidance enhancements remain in development.

## Database

Migration `20261103103652_shopping_items.sql` creates `public.shopping_items`: UUID primary key, owner FK to auth.users, bounded name/unit/notes, positive quantity, purchased boolean default false, fictional-data constraint and creation timestamp. An owner/creation index supports retrieval. Four owner-scoped RLS policies protect CRUD with both USING and WITH CHECK on update. Anonymous access is revoked. No previous schema, profile rule or assessment record is changed. Use fictional entries for academic testing; free-text fields cannot detect participant data.

The migration was applied to the connected project through SQL; its file is retained for clean setup. Do not reapply it blindly to the configured database. CLI migration history was not changed.

## Verification

Unit/UI tests cover validation, exact-name pantry matching, internal recommendation/reminder routes, add/edit/purchase/unpurchase/delete, persistence on remount, separate pantry/list load failures, unconfirmed mutation failure and signed-out access. Database tests check CRUD, default purchase status, constraints, owner reassignment prevention, two-account isolation and anonymous denial. Hosted schema permissions and a rolled-back authenticated mutation smoke test are checked separately. Existing personalisation, history, reminders and photo-recognition tests are retained.

Hosted verification confirmed RLS, four policies, authenticated CRUD and no anonymous SELECT. Security advisors reported no shopping-table findings. Existing advisories about [security-definer exposure](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remain unchanged.
