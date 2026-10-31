import { mkdir, writeFile } from 'node:fs/promises';
import { SCENARIOS } from '../src/data/scenarios.js';
import { personalise, INDICATORS, RULE_VERSION } from '../src/domain/personalisation.js';

// Independently specified expectations: do not derive these from the rule catalog.
const expectedActions = {
  Overbuyer: 'check-before-shopping',
  'Food Forgetter': 'use-first-area',
  'Poor Meal Planner': 'plan-before-shopping',
  'Leftover Discarder': 'plan-leftover-use',
  'Storage Learner': 'check-storage-instructions',
};
const rows = SCENARIOS.map((scenario) => {
  const actual = personalise(scenario.scores);
  const expectedRecommendations = scenario.expectedProfiles.length
    ? scenario.expectedProfiles.map((profile) => expectedActions[profile]) : ['general-prevention'];
  const actualRecommendations = actual.recommendations.map(({ id }) => id);
  const passed = JSON.stringify(actual.profiles) === JSON.stringify(scenario.expectedProfiles)
    && JSON.stringify(actualRecommendations) === JSON.stringify(expectedRecommendations);
  return { scenario: scenario.id, household: scenario.label, scores: scenario.scores,
    expectedProfiles: scenario.expectedProfiles, actualProfiles: actual.profiles,
    expectedRecommendations, actualRecommendations, passed };
});
const output = new URL('../docs/evaluation/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('scenario-results.json', output), JSON.stringify({
  generatedAt: new Date().toISOString(), ruleVersion: RULE_VERSION,
  scope: 'Synthetic JavaScript scenario evaluation; not participant or food-waste outcome data', rows,
}, null, 2) + '\n');
const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
const table = [
  ['scenario', 'fictional_household', ...INDICATORS.map(({ id }) => id), 'expected_profiles', 'actual_profiles', 'expected_recommendations', 'actual_recommendations', 'status'],
  ...rows.map((row) => [row.scenario, row.household, ...INDICATORS.map(({ id }) => row.scores[id]),
    row.expectedProfiles.join('; ') || 'None', row.actualProfiles.join('; ') || 'None',
    row.expectedRecommendations.join('; '), row.actualRecommendations.join('; '), row.passed ? 'PASS' : 'FAIL']),
];
await writeFile(new URL('scenario-results.csv', output), table.map((row) => row.map(quote).join(',')).join('\n') + '\n');
console.log(`${rows.filter(({ passed }) => passed).length}/${rows.length} fictional scenarios passed (${RULE_VERSION}).`);
if (rows.some(({ passed }) => !passed)) process.exitCode = 1;
