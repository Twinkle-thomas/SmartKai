# Nine integrated tools — delivery and manual checks

5 November 2026. This is a working academic prototype for fictional household scenarios, not a production service or evidence of actual food-waste reduction. The existing homepage, visual theme, assessment rules, evaluator authentication and saved assessments are retained. The dashboard adds suggestions using the existing five profile names without changing the classification module.

## Status

| Tool | Status | Implemented workflow and limits |
| --- | --- | --- |
| Pantry Manager | Completed for prototype evaluation | Search, category/location filters, sorting, single or multi-item add, edit/delete, quantities/units, purchase dates, a primary use-by/best-before/prepared-on label date, original ingredient illustrations, explicit partial/whole consumption and disposal, archived entries and outcome history. One primary label date per entry; no unit conversion or stock sufficiency inference. |
| Expiry Tracker | Completed for prototype evaluation | Shared pantry dates, list and month calendar, editable records from calendar, days remaining/passed, adjustable look-ahead and links to weekly reminder preferences. No expiry is inferred from preparation dates. Weekly in-app/calendar reminders are retained; no server push or per-item background notifications. |
| Smart Shopping List | Completed for prototype evaluation | CRUD, purchased state, category ordering/filter, quantities, units, optional total item cost in NZD, exact normalized-name duplicate warnings, explicit meal ingredient additions, reviewed purchased-item transfer. A durable transfer timestamp prevents recreation even after the resulting pantry entry is deleted. A new purchase needs a new shopping entry. |
| Weekly Meal Planner | Completed for prototype evaluation | Seven-day calendar, four meal slots, edit date/time to rearrange, pantry recipe matching, date badges, missing-ingredient review into shopping, saved plans and actual consumption confirmation. Users enter exact consumed quantities in recorded units; no conversion, automatic recipe scaling or planning-time deduction. |
| Leftover Manager | Completed for prototype evaluation | Shared inventory, preparation/storage/planned-use dates, frozen/available states, conservative reuse ideas, meal/storage links, partial/whole outcomes and required disposal reasons through the outcome form. Manual edits remain corrections, not a measured waste log. |
| Food Storage Guide | Completed for prototype evaluation | Seven searchable food entries with category filters and detail routes, plus six general safety/source cards. Relevant pantry names link to food guidance, others to a storage topic. This is a starter library, not comprehensive per-food safety advice. |
| Image Pantry Scanner | Completed with limited recognition | Actual local COCO-SSD inference, preview, ten supported classes, uncertainty disclosure, reject or review/edit each suggestion and deliberate save. No invented detections, amounts or dates. Packaged/obscured foods may be missed; model/download errors retain manual entry. |
| Barcode Scanner | Completed with device-dependent scanning | Live camera start/stop, camera-photo decoding, typed GTIN, checksum validation, explicit product lookup, editable pantry review and manual fallback. Camera permissions, unavailable hardware, insecure origins and network failures are handled. Actual phone-camera performance still needs manual device testing. |
| Community Food Sharing | Completed as simulation only | Private demo listings, status/name/area filters, fixed demo household identities, optional eligible inventory link, reservation/cancellation/collection/withdrawal/edit/delete. Requires confirmation of unopened shelf-stable packaging and a current best-before date. Linking does not reserve or deduct inventory; no real exchange, payments or contact information. |

All tools remain available to every profile. Dashboard suggestions explain the relationship to the reported practice. Existing recommendation strings and provisional scoring remain unchanged.

## Persistence and configuration

`supabase/migrations/20261104232140_integrated_food_workflows.sql` is additive and was applied to the connected project. Do **not** run it twice there. Fresh environments should apply all migration files in order. The existing CLI migration-history bookkeeping was not changed.

The migration adds purchase/preparation/storage dates and disposal notes, shopping category/NZD cost/pantry link/durable transfer timestamp, meal-consumption timestamp and an optional sharing-to-pantry link. `inventory_events` stores snapshots of manually confirmed outcome quantities, units, reasons and meal references. Indexed authenticated-owner RLS isolates events; anonymous access is denied. Linked inventory ownership is checked.

Three security-invoker RPC operations handle actual outcomes, meal consumption and purchased-stock transfer. Row locks protect quantity checks and repeat confirmations. Meal consumption is one transaction: an invalid or overdrawn ingredient rolls the whole batch back. Passed use-by food is rejected for consumption in both the interface and database. Whole-entry outcomes archive the record while retaining its last amount; active queries exclude it. Partial outcomes subtract exactly the confirmed amount and retain an event. Event snapshots survive deletion of a pantry/meal record. Explicit pantry edits can correct records; this is not a tamper-proof research dataset.

Existing `.env.local` configuration is sufficient: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. No secret/service-role key or new paid service is required. Live camera access requires HTTPS or localhost and browser permission. A phone accessing an HTTP LAN address may need photo/manual scanning instead.

External resources: COCO-SSD/TensorFlow model download for local photo inference; Open Food Facts read-only product lookup with attribution and bounded client caching/rate limiting; existing local Tesseract OCR downloads; source links to MPI, FSANZ and [Love Food Hate Waste NZ](https://lovefoodhatewaste.co.nz/storage-tips/). Photo/receipt images stay local. The barcode lookup sends the entered barcode, not household records or images. External downloads/catalog availability are outside SmartKai's control. No additional package was needed in this increment.

## Verification

Final validation: **156 tests passed** (20 Node/database/domain checks and 136 Vitest component/service checks); production build passed. The original eight scenarios and exhaustive 243-combination scoring check remain included.

`npm test` covers original rules/scenarios, UI and service operations, new transaction rollback/quantity checks, double-consumption rejection, durable transfer after pantry deletion, cross-account isolation, sharing eligibility, camera success/denial/pending-stream cleanup, food details, review-before-save and failure states. `npm run build` verifies production bundling. The food-model, OCR and real ZXing synthetic-image smoke scripts from the prior increment remain available.

Hosted verification used temporary synthetic inserts within transactions and rolled everything back. It confirmed partial consumption, disposal and repeat transfer, including a transfer whose pantry record is subsequently removed. No verification entries or existing-record edits remain. Security-advisor findings were unchanged: the earlier auto-RLS security-definer exposure, existing assessment RPC and disabled leaked-password protection remain documented in the prior audit. No new function uses security-definer privileges.

Browser checks confirmed food-library search, its internal detail route and source attribution. A 390-pixel viewport had no horizontal overflow on the detail page. Protected flows are covered by component/database tests; this is not a claim of signed-in browser end-to-end testing, accessibility certification or physical-camera accuracy.

## Manual end-to-end checklist

Use only demonstration entries in evaluator accounts. Refresh the page after each saved change to check persistence.

1. **Pantry:** Add Rice, 4 bags, Pantry, Best before 1 January 2099, plus an optional purchase date. Search for it; test category/location filters, name sorting, editing and a separate disposable item's deletion. Select several starter ingredients, cancel once, then review and save another selection.
2. **Food dates:** Open Expiry → Show calendar. Select January 2099 and select Rice to edit it. Add a separate fictional use-by entry with yesterday's date: it must show a warning and cannot be recorded as consumed. Test today/due-soon/date-passed filters and weekly reminder configuration.
3. **Shopping:** Add Apples, 3 items, Fruit, NZ$4.50. Check it purchased; stock must not change yet. Review its pantry transfer and confirm. Refresh: it must show Previously added. Delete that transferred pantry entry and refresh shopping: it must not offer a second transfer. Create a new shopping record for any new purchase.
4. **Meals:** Plan a Rice dinner, move its date/slot by editing, and review ingredient notes for shopping. A saved plan must not change stock. Record actual consumption of 1.25 bags of Rice: active stock must become 2.75 bags. Refresh: the meal is consumed and cannot deduct a second time.
5. **Leftovers:** Add a separate fictional soup entry with preparation/storage dates and a planned-use date. Record part as discarded with a reason. Confirm remaining stock and load outcome history. Record the remainder used/discarded and check Leftover history. Test freezing on another suitable example without treating its planned date as a safety deadline.
6. **Storage:** Search Carrots in the food library, open its detail route and source link. Follow Storage guidance from a matching pantry entry; check general Fridge/Freezer/Leftovers topics as well.
7. **Photo scanner:** Choose a synthetic/demo image, inspect the preview, analyse and review any actual supported detections. Reject one; correct another in the food form, entering quantities yourself. Nothing should save until Add food item. A non-food image, unsupported format or failed model download must leave manual entry available.
8. **Barcode:** Try a demo product barcode/photo. Look up only by deliberate action, correct the returned name in the pantry form and save explicitly. Test not-found, offline lookup and camera denial. On HTTPS/localhost, start a camera scan and stop it; the stream must close when stopped or when leaving the page. Product-catalog results vary.
9. **Sharing:** Use a sealed dry-goods simulation and link eligible Rice stock. Confirm the simulation condition. Filter the board, switch Demo household A/B, reserve/cancel/reserve/collect, then test another offer's withdrawal/edit/delete. Quantities in pantry must not change; no real address/contact field should exist.
10. **Profiles and isolation:** Save a multiple-profile scenario; inspect dashboard action explanations and access all tools. Confirm existing assessment history and 30-day check-in still work. Sign out and use a second evaluator account: the first account's inventory, shopping, meals, outcomes and sharing board must remain inaccessible.

No actual waste-reduction result, automatic food-safety judgement or complete grocery recognition is claimed.
