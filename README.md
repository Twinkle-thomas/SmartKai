# SmartKai

Academic prototype for **Mitigating Household Food Waste in New Zealand Through a Personalised Web-Based Intervention**, a Master's Information Technology research project at Auckland Institute of Studies, New Zealand.

Use fictional household data only. The five behaviour profiles and thresholds are provisional design decisions, not statistically validated classifications. This prototype demonstrates rule-based personalisation; it does not establish a reduction in actual household food waste.

## Proposed architecture

```text
React + Vite + Tailwind
  Fictional scenario selector → five-answer form → profile/recommendation display
                                      ↓
                      pure JavaScript personalisation module
                                      ↓
                      separate persistence service → Supabase PostgreSQL
```

The browser maps Never/Sometimes/Often to 0/1/2. The domain module validates all five scores, assigns every profile whose indicator is 2, and returns recommendations and explicit assignment reasons. If none is 2, it returns general guidance. The UI owns form state; the domain module has no React or database dependencies. A future persistence service saves input and output together through a database transaction and reports save failures separately from successful local evaluation.

No external AI service is required. Barcode scanning, image recognition, a meal-planning feature and community sharing are outside the initial scope. A recommendation about considering upcoming meals does not imply a meal-planning feature.

## Proposed database schema (not yet deployed)

| Table | Columns and constraints | Purpose |
| --- | --- | --- |
| `households` | `id uuid PK`, `fictional_label text NOT NULL`, `is_fictional boolean NOT NULL DEFAULT true CHECK (is_fictional = true)`, `created_at timestamptz` | Synthetic household identifier; no participant names, addresses or contact details |
| `assessments` | `id uuid PK`, `household_id uuid FK households`, five `smallint NOT NULL` scores each checked between 0 and 2, `rule_version text NOT NULL`, `scenario_key text NULL`, `created_at timestamptz` | Complete input and version needed to explain a result |
| `assessment_results` | `assessment_id uuid PK/FK assessments`, `profiles text[] NOT NULL`, `explanations jsonb NOT NULL`, `recommendations jsonb NOT NULL` | One result snapshot per assessment, including general guidance when profiles is empty |

Score columns: `overbuying`, `forgetting_food`, `poor_meal_planning`, `discarding_leftovers`, `storage_uncertainty`. The persistence service maps these to the domain's camelCase keys. Index `assessments.household_id`; restrict profile values to the five documented names and validate result JSON in the save function. Preserve recommendation snapshots so later wording changes do not alter historic evaluation results.

At the persistence milestone, enable row-level security on all tables and scope records to an authenticated evaluator via an added `owner_id` on households. Do not enable public anonymous reads/writes or put a service-role key in the browser. Supply only the project URL and publishable key through environment configuration. Authentication is for prototype evaluators, not research participants. A fictional-data flag cannot itself detect real data, so prefer generated labels and predefined scenarios over free-text fields.

## Folder structure

```text
src/
  domain/personalisation.js       # Implemented: rules, questions, recommendations
  data/scenarios.js              # Implemented: eight synthetic scenarios
  components/                    # Milestone 2: form, scenario selector, results
  services/                      # Milestone 3: Supabase adapter
  App.jsx                        # Milestone 2
  main.jsx                       # Milestone 2
tests/personalisation.test.js    # Implemented: Node unit tests
supabase/migrations/             # Milestone 3: schema, RLS, transactional save
```

## Development milestones

1. **Rules foundation — completed.** Define provisional indicators, strict validation, multiple-profile assignment, targeted recommendations, general fallback, explanation records and eight fictional scenarios. Verify all 243 valid answer combinations and invalid-input handling.
2. **Local interactive prototype — next.** Add React/Vite/Tailwind, a fictional-data notice, scenario selector, five required frequency inputs, and an accessible results view. Run entirely locally before connecting storage. Verify scenario loading, incomplete-answer handling and displayed reasons.
3. **Fictional record persistence.** Add migrations, evaluator access, RLS policies, environment example and Supabase service. Save complete assessments/results atomically; verify access isolation, reload and failure handling against a test project.
4. **Academic evaluation package.** Add a scenario walkthrough, expected-versus-actual evidence, usability checks and documentation of limitations. Keep claims limited to correct operation of the prototype and its personalisation workflow.

Each increment should remain reviewable before the next is implemented. No database or interface has been created in milestone 1.

## Run the current increment

Requires Node.js 22 or newer. No dependencies or Supabase credentials are needed:

```powershell
npm test
```

The questions are an initial operationalisation of the supplied profiles and should be reviewed for academic suitability. Scores reflect fictional responses to those questions, not validated measurements. Recommendation text is illustrative prevention guidance, not evidence of behavioural impact.
