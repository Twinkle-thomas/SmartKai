# SmartKai prototype evaluation

Project: **Mitigating Household Food Waste in New Zealand Through a Personalised Web-Based Intervention**. Master's Information Technology research project, Auckland Institute of Studies, New Zealand.

## Purpose and scope

Evaluate whether the prototype correctly collects fictional food-management answers, applies transparent predefined rules, generates corresponding guidance and stores/retrieves fictional assessment snapshots. This is software verification and a developer walkthrough, not a participant study, behavioural outcome evaluation or validation of a classification instrument.

No real participant or household observations are used. Evaluator authentication accounts support access testing; their account details are not household research data. Do not include passwords, API keys, account emails or authentication tokens in evaluation screenshots or reports.

## Rule specification

Every question describes a potentially waste-contributing practice. Never = 0, Sometimes = 1 and Often = 2. An indicator with score 2 assigns its corresponding profile. All matching profiles apply. If no score equals 2, return general prevention guidance. Require all five integer answers; reject missing, unknown or invalid values rather than treating them as zero.

| Indicator | Provisional profile | Recommendation ID | Suggested action |
| --- | --- | --- | --- |
| Buying more food than needed | Overbuyer | `check-before-shopping` | Check supplies and shop with quantities |
| Forgetting food until unusable | Food Forgetter | `use-first-area` | Use a visible use-first area |
| Shopping without considering upcoming meals | Poor Meal Planner | `plan-before-shopping` | Consider meals using existing food before shopping |
| Discarding leftovers instead of using them | Leftover Discarder | `plan-leftover-use` | Plan suitable leftover use and appropriate portions |
| Uncertainty about food storage | Storage Learner | `check-storage-instructions` | Consult packaging and organise storage |
| No indicator equals 2 | No assigned profile | `general-prevention` | General guidance on supplies, shopping and food use |

Version: `provisional-v1`. These profiles, questions and thresholds are provisional design decisions. They are not statistically validated or diagnoses. Recommendation text is illustrative and its effectiveness has not been measured.

## Predefined fictional scenario matrix

Score order: overbuying / forgetting food / poor meal planning / discarding leftovers / storage uncertainty.

| Scenario | Scores | Expected profiles | Expected recommendations |
| --- | --- | --- | --- |
| A: no frequent indicators | 0 / 1 / 0 / 1 / 0 | None | General guidance |
| B: overbuyer only | 2 / 0 / 1 / 0 / 1 | Overbuyer | Check before shopping |
| C: forgetter only | 0 / 2 / 0 / 1 / 0 | Food Forgetter | Use-first area |
| D: planner only | 1 / 0 / 2 / 0 / 0 | Poor Meal Planner | Consider upcoming meals |
| E: leftovers only | 0 / 1 / 0 / 2 / 0 | Leftover Discarder | Suitable leftover use |
| F: storage only | 0 / 0 / 1 / 0 / 2 | Storage Learner | Storage instructions |
| G: multiple profiles | 2 / 2 / 0 / 1 / 2 | Overbuyer; Food Forgetter; Storage Learner | Three corresponding actions |
| H: all profiles | 2 / 2 / 2 / 2 / 2 | All five | All five corresponding actions |

The generated [CSV](scenario-results.csv) and [JSON](scenario-results.json) record expected and actual profiles/recommendation IDs for each scenario. They are software execution outputs, not research findings about households.

## Requirement-to-evidence traceability

| Requirement | Implementation | Evidence | Limits |
| --- | --- | --- | --- |
| Collect fictional practices | Five required radio groups and scenario selector | `tests/app.ui.test.jsx` | jsdom does not establish real-world usability |
| Assign one or more profiles | Pure JavaScript rules | `tests/personalisation.test.js`; scenario outputs | Covers implemented rules, not validity of profile constructs |
| Targeted recommendations and fallback | Versioned rule catalog | Scenario expected/actual action IDs; unit tests | Recommendation effectiveness unmeasured |
| Explain classifications | Result reasons with score/threshold | UI tests and developer walkthrough | Explanation comprehension unmeasured |
| Persist inputs and result snapshots | Three tables and atomic save RPC | `tests/database.test.js`; `tests/assessments.service.test.js` | Local Auth functions are stand-ins |
| Evaluator isolation | RLS ownership and authenticated RPC | Local SQL isolation checks; reported two-account walkthrough | No independent hosted security audit |
| Reload saved results | Evaluator history and session restoration | `tests/storage.ui.test.jsx`; reported refresh walkthrough | Browser checks are developer-reported |
| Avoid stale UI and handle failures | Clear results after edits; request guards and error messages | UI/service tests | Live network-failure walkthrough still pending |

## Reproduce automated verification

Use the committed lockfile and a supported Node version. Run from the repository root:

```powershell
npm ci
npm test
npm run evaluate
npm run build
```

`npm test` includes domain tests, a PGlite SQL integration test, service mocks and React interface tests. The SQL integration test checks all 243 combinations against JavaScript, every predefined scenario, invalid inputs, cross-account read isolation, denied direct writes and rollback when the final result insert is forced to fail. This evaluates the committed migration in a local PostgreSQL-compatible runtime, not the hosted project's full configuration.

`npm run evaluate` regenerates dated CSV/JSON evidence for the eight scenarios. The expectation mapping in the generator is specified separately from the recommendation catalog. Review expectations when rules change; passing tests alone do not establish that the requirements are appropriate.

The build verifies bundling. It does not test deployment. The final Git commit identifies the reviewed implementation; capture `git rev-parse HEAD` when reporting a later evaluation run.

## Browser walkthrough and evidence record

Record for 31 October 2026 (Pacific/Auckland): the developer reported successful completion of the following checks in the project chat. This is reported evidence; no screenshots or independent authenticated browser recordings were collected by the agent.

| Check | Expected behaviour | Reported observation | Evidence status |
| --- | --- | --- | --- |
| Load multiple-profile scenario | More than one corresponding profile appears | Developer confirmed multiple profiles | Developer-reported pass |
| General fallback, edit, reset, required answers | General guidance; stale results clear; reset clears; blank submission blocked | Developer confirmed supplied local checklist worked | Developer-reported pass |
| Evaluator sign-in and save | Save confirmation and history entry | Developer confirmed completion of supplied connected checklist | Developer-reported pass |
| Refresh saved record | Saved snapshot remains in history | Same checklist confirmation | Developer-reported pass |
| Sign out and switch evaluator | First evaluator's records absent for second | Same checklist confirmation | Developer-reported pass |

Separate read-only agent checks on 31 October 2026 observed the configured Auth settings endpoint returning HTTP 200 with public sign-ups disabled and a signed-out assessment read returning HTTP 401. No evaluator passwords or authenticated hosted writes were used by the agent.

Still to document: phone/desktop visual layout, keyboard-only flow, screen-reader behaviour, explanation clarity and a live network-failure save. Do not record these as passed based on unit tests. For each future check, note date, browser/version, viewport, steps, expected/actual behaviour, evidence filename and any issue. Redact account details from screenshots.

## Suggested five-minute demonstration

1. Show the fictional-data notice and explain the provisional frequency scores.
2. Load Household G; display its three profiles, recommendations and assignment reasons.
3. Load Household A to demonstrate the general-guidance fallback.
4. Change an answer and show that old results clear before recomputing.
5. Sign in as Evaluator A, save a fictional assessment and refresh to retrieve the snapshot.
6. Sign out and sign in as Evaluator B to demonstrate separate saved histories.
7. State the limitations below and identify future enhancements as outside this prototype.

## Interpretation and limitations

The evidence supports correct execution of the implemented personalisation workflow for the tested synthetic inputs. It does not demonstrate reduction of actual household food waste, behavioural change, causal effects, population representativeness or predictive accuracy. There are no measured food-waste outcomes, real participant responses or statistically estimated thresholds.

One indicator per profile and a three-level response scale simplify evaluation but may omit important context. Multiple profiles express overlapping rule matches, not measured psychological traits. SQL and JavaScript intentionally duplicate versioned rules and require parity checks when changed. Each save is an independent fictional household snapshot; longitudinal household tracking is not implemented. Duplicate outcomes remain possible after uncertain network failures or intentional resubmission; there is no idempotent retry protocol. History shows only the 50 newest accessible records.

The project is a research prototype. Public deployment, production hardening, participant recruitment and collection of real research data require separate decisions. Barcode scanning, image recognition, meal-planning functionality and community sharing remain future enhancements.
