# SmartKai feature-completion audit — 5 November 2026

The later [integrated delivery](nine-tools-delivery.md) supersedes this snapshot for calendar views, purchase transfers, actual consumption, disposal events, food-specific storage pages and live camera scanning.

This audit describes implemented academic-prototype workflows, not production readiness, statistically validated classification or measured food-waste reduction. Evaluation must use fictional household entries and synthetic scenarios. The original five-profile thresholds, eight scenarios, evaluator authentication and assessment history are preserved.

| Tool | Implementation | Practical limits |
| --- | --- | --- |
| Pantry Manager | Saved add/edit/delete, quantities, storage locations, food categories, category filtering and searchable multi-ingredient selection | One evaluator account represents one prototype household; up to 500 records per pantry view |
| Food-date Tracker | `#/expiry`: use-by/best-before highlights, today/passed/due-soon filters, 1/3/7/14-day horizon, NZ calendar-day calculation | Prepared-on is not converted into an expiry date; dates cannot establish safety |
| Shopping List | Saved items, quantities, notes, purchased state and pantry name matching | No retailer checkout, stock deduction, unit conversion or offline synchronization |
| Meal Planner | Dated weekly plans, portions, pantry/leftover notes, five original pantry-matched recipes and explicit shopping additions | Recipes use ingredient-name aliases, not inferred sufficiency or dietary advice |
| Leftover Manager | `#/leftovers`: shared pantry records, planned-use dates, available/frozen/used/discarded status and terminal-entry history | Outcomes apply to the whole entry, are manually reported and can be corrected by editing; no waste-weight measurement |
| Storage Guide | `#/storage`: topic/search filters and six source-linked cards | General guidance, not a per-item safety assessment; source instructions remain authoritative |
| Image Pantry Scanner | Real local COCO-SSD inference and manual pantry review | Ten supported food classes; packaged/obscured food is often missed; no automatic quantities, dates or safety prediction |
| Barcode Scanner | `#/barcode`: local photo decoding/camera file input or typed GTIN, check-digit validation, optional Open Food Facts lookup and explicit review | Not a continuous video scanner; catalog/device/network coverage varies; pack labels are not stock quantities |
| Community Sharing | `#/sharing`: saved private demo offers, editing, reservation/cancellation, collection, withdrawal and confirmed deletion between demo actors | Simulation only; unopened shelf-stable examples, no real listings, contact details, collection arrangements, messages or public cross-account board |

`#/tools` lists all nine tools and links to each workflow. Homepage labels now reflect the implemented tools and preserve illustrative-preview captions. Profile recommendation actions and reminder routes open the appropriate application pages. Questionnaire display remains intentional on its separate route.

Other preserved workflows include explicit assessment saving, restored sessions, new/returning account journeys, weekly reminder preferences and calendar export, monthly questionnaire comparison, local receipt OCR and manual receipt-item review. Calendar alerts still depend on user import/device settings; questionnaire differences describe reported habits, not measured waste reduction.

## Data changes

### Ingredient selection

Pantry → Add ingredients opens a searchable, illustrated starter list of 32 ingredients. Selection persists across searches and category filters. Users can select a common storage location or suggested locations, create a custom ingredient, then review each quantity, unit, location, category and optional food date. Quantities start at 1 and dates remain blank; neither is inferred. Existing pantry names are flagged and are not automatically merged.

Up to 50 reviewed items are validated before a single bulk insert using the existing authenticated pantry service and owner policies. No database migration is required. Selecting or cancelling does not save anything. An unconfirmed save returns users to check their pantry rather than offering a blind retry. The original manual form and receipt, photo and barcode imports remain available. The catalog is original starter data with code-drawn illustrations, not an external branded product database.

Component tests cover search/filter selection retention, storage overrides, review changes, custom entries, cancellation, save errors and the integrated pantry batch flow. Service tests verify one validated insert and rejection of an invalid batch before insertion.

Migration `20261104214337_complete_household_tools.sql` adds `category`, `planned_use_date` and `leftover_status` to pantry records with backward-compatible defaults. Non-leftovers cannot carry leftover outcomes/plans; frozen leftovers require Freezer location. Used/discarded rows are retained and excluded from active pantry queries used by recipes, shopping and meal ingredient views. The normal pantry view can retrieve archived rows for the Leftover history filter. Recipe name matching additionally ignores passed use-by records.

`sharing_offers` uses authenticated-owner RLS for all CRUD. Its simulation flag is constrained true, donor/recipient are fixed demo labels, and date, quantity, region and state constraints are checked. Reservations/collections use conditional updates against the previous status to reject stale writes. Demo actors operate inside one evaluator account: they are not real authentication identities. A recorded best-before date and an intact-packaging checkbox are demonstration eligibility rules, not verification that actual food is suitable.

The migration was applied to the connected SmartKai database through SQL; existing records were preserved. Keep the migration file for clean setup and do not apply it twice to the same database. Existing CLI migration history was not changed. There are no public anonymous grants on the new table.

## External dependencies and sources

Barcode images are processed locally by pinned `@zxing/browser`/ZXing packages. Only an explicitly submitted barcode is sent to the Open Food Facts read-only v3.6 product endpoint. Requests omit credentials, use a five-requests-per-minute client cap and a bounded five-minute memory cache. No product/household writes or image uploads are sent to that provider. Product information is attributed to Open Food Facts with its ODbL link. Unknown, invalid, timed-out or rate-limited lookups retain manual pantry entry. Review the provider's application-registration/usage guidance before public deployment; its public API availability is outside SmartKai's control.

Storage text is sourced from [MPI home preparation/storage guidance](https://www.mpi.govt.nz/food-safety-home/preparing-and-storing-food-safely-at-home/safe-food-preparation-cooking-and-storage-at-home), [FSANZ date labels](https://www.foodstandards.gov.au/consumer/labelling/dates) and [FSANZ storage](https://www.foodstandards.gov.au/business/food-safety/storing-food-safely). These links are displayed in the application. Source review date: 5 November 2026.

## Verification and remaining validation

Automated checks cover new category/leftover/date rules, NZ date boundaries, active/history filtering, barcode validation/catalog errors/cache, sharing actor/state transitions, database constraints, two-account RLS isolation, preserved legacy records, anonymous denial and nine implemented internal routes. UI tests exercise date filters, whole-entry outcomes/history, guide search, barcode review, and the demo offer/reservation/collection/deletion flow. The original assessment and other module suites remain part of `npm test`.

`npm run verify:barcode` decodes a synthetic EAN-13 fixture using the real ZXing engine. A live catalog read and its CORS preflight were checked separately; unit tests use mocks and do not generate provider traffic. Hosted database mutation checks were rolled back, leaving no verification entries. Security advisors reported no new-table finding; earlier [security-definer](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [password-protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) advisories remain unchanged.

Browser checks at a 390-pixel viewport verified nine tool cards, the storage-guide route/source links and no horizontal overflow. Signed-in data flows are covered by component and database tests, not claimed as end-to-end physical-device testing. Real phone camera recognition, receipt accuracy, calendar notification delivery, deployment email redirects and user evaluation remain necessary before making a production-readiness claim. No accessibility certification, recognition-accuracy benchmark or actual waste-reduction result is claimed.
