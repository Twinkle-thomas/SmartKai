# SmartKai

Academic prototype for **Mitigating Household Food Waste in New Zealand Through a Personalised Web-Based Intervention**, a Master's Information Technology research project at Auckland Institute of Studies, New Zealand.

Use fictional household data only. The five behaviour profiles and thresholds are provisional design decisions, not statistically validated classifications. This prototype demonstrates rule-based personalisation; it does not establish a reduction in actual household food waste.

The current prototype implements all nine requested tool workflows: pantry categories, food-date tracking, shopping, meal planning, leftover status/history, sourced storage guidance, a limited food-photo AI preview, barcode lookup and a private community-sharing simulation. Open **All tools** (`#/tools`) to explore them. See the [nine-tool delivery and manual checklist](docs/nine-tools-delivery.md) for current integrated workflows and configuration. See the [current feature audit](docs/feature-completion-audit.md) for implemented scope, validation and device-dependent limits.

## Architecture

```text
React + Vite + Tailwind
  Fictional scenario selector → five-answer form → profile/recommendation display
                                      ↓
                      pure JavaScript personalisation module
                                      ↓
                      separate persistence service → Supabase PostgreSQL
```

The browser maps Never/Sometimes/Often to 0/1/2. The domain module validates all five scores, assigns every profile whose indicator is 2, and returns recommendations and explicit assignment reasons. If none is 2, it returns general guidance. The UI owns form state; the domain module has no React or database dependencies. The persistence service saves input and output together through a database transaction and reports save failures separately from successful local evaluation.

The initial research scope did not include scanners, meal planning or community sharing. These were subsequently authorised and implemented as the bounded prototype workflows described in the delivery document. Food recognition runs locally without a paid inference service.

Later increments added saved pantry inventory and a 30-day questionnaire check-in. See [Pantry and check-ins](docs/pantry-and-check-ins.md) for workflow, schema, simulated evaluation cases and measurement limits. Pantry CRUD, quantities, date types, use-first/leftover views and storage notes are available; shopping lists and the manual weekly meal planner are now available. Follow-up scores describe self-reported habits and do not measure actual waste reduction.

Optional [weekly reminders](docs/reminders.md) let evaluators choose days and times, receive in-app alerts and export saved schedules to a phone calendar. SmartKai itself does not send notifications while closed; phone-calendar alerts depend on importing the file and calendar/device settings.

The [food-recognition preview](docs/food-recognition.md) adds local browser AI without a paid inference API. It supports ten food classes and requires manual review, quantities and explicit pantry saving. Photos remain local; the model cannot identify a full grocery inventory or infer dates/safety. This is a later authorised enhancement beyond the initial scope above.

## Database schema

| Table | Columns and constraints | Purpose |
| --- | --- | --- |
| `households` | `id uuid PK`, `owner_id uuid FK auth.users`, `fictional_label text NOT NULL`, `is_fictional boolean NOT NULL DEFAULT true CHECK (is_fictional = true)`, `created_at timestamptz` | Synthetic household identifier; no participant names, addresses or contact details |
| `assessments` | `id uuid PK`, `household_id uuid FK households`, five `smallint NOT NULL` scores each checked between 0 and 2, `rule_version text NOT NULL`, `scenario_key text NULL`, `created_at timestamptz` | Complete input and version needed to explain a result |
| `assessment_results` | `assessment_id uuid PK/FK assessments`, `profiles text[] NOT NULL`, `explanations jsonb NOT NULL`, `recommendations jsonb NOT NULL` | One result snapshot per assessment, including general guidance when profiles is empty |

Score columns: `overbuying`, `forgetting_food`, `poor_meal_planning`, `discarding_leftovers`, `storage_uncertainty`. The persistence service maps these to the domain's camelCase keys. Index `assessments.household_id`; profile values are constrained to the five documented names, and the save function derives result snapshots from validated scores. Preserve recommendation snapshots so later wording changes do not alter historic evaluation results.

Row-level security is enabled on all three tables, with records scoped to the authenticated evaluator through `households.owner_id`. Do not enable public anonymous reads/writes or put a service-role key in the browser. Supply only the project URL and publishable key through environment configuration. Authentication is for prototype evaluators, not research participants. A fictional-data flag cannot itself detect real data, so prefer generated labels and predefined scenarios over free-text fields.

## Folder structure

```text
src/
  domain/personalisation.js       # Implemented: rules, questions, recommendations
  data/scenarios.js              # Implemented: eight synthetic scenarios
  components/                    # Implemented: practice form and results
  services/                      # Implemented: Supabase client and assessment adapter
  App.jsx                        # Implemented: scenario selection and page state
  main.jsx                       # Implemented: React entry point
  styles.css                     # Implemented: Tailwind and shared styles
tests/personalisation.test.js    # Implemented: Node unit tests
supabase/migrations/             # Implemented: schema, RLS, transactional save
```

## Development milestones

1. **Rules foundation — completed.** Define provisional indicators, strict validation, multiple-profile assignment, targeted recommendations, general fallback, explanation records and eight fictional scenarios. Verify all 243 valid answer combinations and invalid-input handling.
2. **Local interactive prototype — implemented; core browser workflow confirmed by developer.** React/Vite/Tailwind, fictional-data notice, scenario selector, five required radio groups, and results with assignment reasons. Automated interface tests cover all eight scenarios, required answers, focus movement, edited answers and reset. Changing an answer clears old results and marks the household as custom fictional input. Local evaluation does not save automatically; evaluator storage is available separately.
3. **Fictional record persistence — implemented.** Migrations, evaluator sign-in, RLS policies, environment configuration, explicit save and history are available. Automated tests cover atomic writes, isolation and failure handling. The developer reported successful hosted sign-in, save, refresh and two-account isolation checks; live network-failure evidence remains pending.
4. **Academic evaluation package — prepared.** See the [evaluation guide](docs/evaluation/evaluation-guide.md) for scenario matrices, requirements traceability, expected-versus-actual outputs, a demonstration walkthrough and limitations. Visual, assistive-technology and formal usability evaluation remain unverified.

The core prototype is implemented. Distinguish automated checks, developer-reported browser checks and outstanding evaluation work as documented in the evaluation guide.

## Run the current increment

The homepage now presents the product and six feature previews. Use **Explore SmartKai** for the dashboard or **Get Personalised Recommendations** to open the assessment. The questionnaire is not mounted on the homepage. Five planned tools are explicitly labelled **In development**; existing assessment, authentication and saved history remain functional. See [homepage design and routes](docs/homepage-redesign.md).

Homepage-only Motion effects add reveals, restrained parallax and a desktop sticky product story, with inline layouts for small screens and reduced motion. See [scroll animation behaviour and verification](docs/homepage-scroll-motion.md).

The homepage now includes locally hosted, responsive food photography, preserving the green theme. See [photography sources, licensing and optimisation](docs/photography.md).

Dedicated `#/register` and `#/login` pages now reuse Supabase Auth and the existing account flow. Live registration requires enabling sign-ups, setting confirmation URLs and configuring email delivery in the project; see [registration and login setup](docs/registration-login.md).

Use Node.js 22.12 or newer (Node.js 24 was used for verification). Install dependencies from the lockfile; no Supabase credentials are needed:

```powershell
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). Stop the server with Ctrl+C.

```powershell
npm test
npm run evaluate
npm run build
npm run preview
```

Tests comprise 13 domain tests, one local PostgreSQL integration test (SQL/JavaScript parity for all 243 inputs, access isolation and validation), 5 service tests and 17 interface tests. The production build writes to ignored `dist/`. Interface tests use jsdom; they do not substitute for visual or assistive-technology checks in a real browser.

### Manual interface review

1. Submit a blank form: the browser should request a missing answer.
2. Load Fictional Household G and view guidance: expect Overbuyer, Food Forgetter and Storage Learner, each with its targeted recommendation.
3. Open the assignment explanation and verify the score-2 reasoning.
4. Change an answer: old results should disappear. Submit again to evaluate the changed fictional household.
5. Load Household A: expect no profiles and general prevention guidance.
6. Select Start again: answers and results should clear. Refresh also clears page state.
7. Review at phone and desktop widths. Use Tab and arrow keys through the radio groups, submit, and check that focus moves to the results heading. Check the skip link and native required-answer prompts.

Setup follows the official [Vite guide](https://vite.dev/guide/) and [Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite).

The questions are an initial operationalisation of the supplied profiles and should be reviewed for academic suitability. Scores reflect fictional responses to those questions, not validated measurements. Recommendation text is illustrative prevention guidance, not evidence of behavioural impact.


## Supabase connection

Follow [Supabase setup](docs/supabase-setup.md) to create a project, apply the migration and configure the ignored environment file. The UI now supports evaluator sign-in, explicit save, history, saved snapshot inspection and sign-out. Read-only live checks passed; the developer also reported successful authenticated save/reload and account-isolation checks. Local SQL tests use PGlite with stand-in Auth functions; they do not test Supabase Auth itself. The developer created the Supabase project and applied the migration. The agent has not made hosted database writes.

Shopping lists are now available at `#/shopping`: saved items and quantities, purchased checkboxes and a companion pantry view. See [shopping-list implementation and evaluation](docs/shopping-lists.md). The manual weekly meal planner is available in the subsequent increment.

The [meal planner](docs/meal-planning.md) at `#/meals` saves dated meals, portions and ingredient/leftover notes, with explicit missing-ingredient additions to shopping. It does not reserve or deduct stock, infer recipes or establish measured waste reduction.

[Receipt import and pantry recipe ideas](docs/receipt-import-and-recipes.md) now extend these tools: local English OCR with mandatory item review, and a small original recipe library matched to recorded pantry names. No receipt photos/text are stored remotely, no paid OCR API is used, and neither flow changes stock or saves an item/meal without confirmation.
