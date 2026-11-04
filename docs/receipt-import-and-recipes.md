# Receipt import and pantry recipe ideas

Both enhancements extend the existing pantry/meal workflow. They do not change authentication, profile rules, saved assessment snapshots or existing tables. Use synthetic receipt examples and fictional inventory for academic evaluation, not participant receipts or household data.

## Receipt import

Pantry → **Add food from a grocery receipt** accepts JPEG, PNG and WebP photos, with an optional camera input where supported. Images must decode successfully and remain within 8 MB/24 megapixels; PDFs/HEIC are unsupported. **Read receipt** explicitly loads Tesseract.js 7 English OCR. Recognition executes locally in a browser worker using a canvas with a maximum 3000-pixel edge. Worker/core/language assets download from Tesseract's default public hosts, so connectivity is required; no paid inference API, secret or account is needed. Device processing, internet and hosting costs remain separate from API fees.

Photos and raw OCR text are not uploaded to Supabase or a cloud OCR service. Temporary preview URLs are revoked on replacement/removal/unmount; canvases are cleared and workers terminated after OCR. Cancelling aborts result delivery and terminates an available worker. If cancellation occurs during worker initialization, the worker is terminated when initialization finishes; public asset downloads may still finish. Language filesystem caching is disabled; browser HTTP caching can still apply to downloaded public assets. Raw images/text stay only in local component memory until cleared or navigation/sign-out unmounts the account workspace.

The bounded parser examines up to 20,000 characters/300 lines and suggests at most 100 price-ending item lines. It strips simple leading product codes/count prefixes and trailing decimal prices, excludes common total/payment/discount metadata and ignores negative-price lines. It is not retailer-specific, a semantic food classifier or an accounting tool. It can include non-food purchases and miss split-line/weight/multi-column items. OCR abbreviations and character mistakes need correction; quantity, unit, expiry dates and storage location are not inferred. Users can edit/paste receipt text and explicitly regenerate suggestions.

**Review item** copies only a proposed product name into the existing pantry form, with quantity/unit blank, location Other, no food date and no raw receipt/payment text in notes. The evaluator chooses storage, corrects the name and quantity, and explicitly confirms Add food item through the unchanged pantry service. Suggestions are not marked saved when reviewed. Users must check existing inventory before re-adding an item; duplicate merging and batch import are not implemented. Discard suggestion only removes a local suggestion. No receipt table or file-storage bucket is created.

## Pantry recipe ideas

Meal planner → **Recipes from your pantry** uses five original two-portion recipes in `src/data/recipes.js`, without a new AI service or copied website recipe content. Ideas appear when at least two distinct required ingredient types match normalized inventory names through explicit aliases. Complete name matches rank first. Duplicate pantry rows do not count as extra ingredient types. Quantities, brands and pantry record freshness are not interpreted, and ambiguous dry chickpeas are not treated as canned chickpeas.

Cards show recorded versus unmatched ingredients, recipe amounts and preparation steps. “All ingredient types matched” is not a claim that sufficient quantities or suitable food are available. Users review packaging, freshness and dietary suitability themselves. A pantry load failure produces no invented recommendations. The small library can return no ideas even when a household could make many other meals.

**Plan [recipe]** creates an unsaved meal draft with a name, two portions, ingredient amounts and steps. It preserves the selected meal date/time, clears any existing edit target, and requires explicit save. Recipe amounts do not automatically scale when portions are changed; this is stated in the interface. Users can edit the recipe before saving and use the existing saved-meal missing-ingredient form to add shopping entries. No stock is reserved/deducted and no leftovers are automatically consumed.

## Verification

Receipt unit/UI tests cover metadata filtering, bounded suggestions, no inferred quantities/dates, explicit OCR initiation, local preview cleanup, text corrections, cancellation with ignored late results, worker cleanup/abort, OCR failures, and the final manual pantry confirmation. `npm run verify:receipt-ocr` runs the actual English OCR engine on a generated synthetic receipt in memory; the checked image produced MILK 2L, APPLES and BREAD and excluded TOTAL. It is a smoke check, not a retailer accuracy evaluation. Browser worker/network behaviour and phone capture still need target-device evaluation.

Recipe tests cover explicit aliases, minimum distinct matches, ranking, partial matches, valid bounded meal drafts, no inventory-quantity inference and explicit draft/save behaviour. Existing app and database tests remain intact.

Primary OCR reference: [Tesseract.js API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md), [licence and supported scope](https://github.com/naptha/tesseract.js). Package version and lockfile are pinned. Recipe source is the original local library, not scraped or attributed to an external author.
