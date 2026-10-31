import test from 'node:test';
import assert from 'node:assert/strict';
import { personalise, INDICATORS, FREQUENCY_SCORES } from '../src/domain/personalisation.js';
import { SCENARIOS } from '../src/data/scenarios.js';

test('frequency labels implement the proposed scoring', () => {
  assert.deepEqual(FREQUENCY_SCORES, { Never: 0, Sometimes: 1, Often: 2 });
});

for (const scenario of SCENARIOS) {
  test(`fictional scenario: ${scenario.id}`, () => {
    const result = personalise(scenario.scores);
    assert.deepEqual(result.profiles, scenario.expectedProfiles);
    assert.deepEqual(result.recommendations.map((r) => r.profile), scenario.expectedProfiles.length ? scenario.expectedProfiles : [null]);
    assert.ok(result.recommendations.every((r) => r.text.length > 0));
    assert.equal(result.ruleVersion, 'provisional-v1');
  });
}

test('each profile generates its specific recommendation and transparent reason', () => {
  for (const indicator of INDICATORS) {
    const input = Object.fromEntries(INDICATORS.map(({ id }) => [id, id === indicator.id ? 2 : 0]));
    const result = personalise(input);
    assert.deepEqual(result.recommendations, [{ id: indicator.recommendationId, profile: indicator.profile, text: indicator.recommendation }]);
    assert.deepEqual(result.explanations, [{ indicator: indicator.id, profile: indicator.profile, score: 2, threshold: 2 }]);
  }
});

test('all 243 valid score combinations obey the threshold and recommendation coverage', () => {
  for (let combination = 0; combination < 3 ** 5; combination++) {
    const input = Object.fromEntries(INDICATORS.map(({ id }, index) => [id, Math.floor(combination / 3 ** index) % 3]));
    const result = personalise(input);
    const expected = INDICATORS.filter(({ id }) => input[id] === 2).map(({ profile }) => profile);
    assert.deepEqual(result.profiles, expected);
    assert.deepEqual(result.recommendations.map(({ profile }) => profile), expected.length ? expected : [null]);
    if (!expected.length) assert.equal(result.recommendations[0].id, 'general-prevention');
  }
});

test('rejects missing, extra, and invalid answers', () => {
  const valid = SCENARIOS[0].scores;
  for (const input of [null, [], 'Often', {}, { ...valid, extra: 2 }]) assert.throws(() => personalise(input), TypeError);
  for (const { id } of INDICATORS) {
    for (const invalid of [-1, 3, 1.5, '2', undefined, null, NaN, true]) {
      assert.throws(() => personalise({ ...valid, [id]: invalid }), TypeError);
    }
  }
});

test('evaluation does not mutate inputs or share mutable output between calls', () => {
  const input = Object.freeze({ ...SCENARIOS[0].scores });
  const first = personalise(input);
  first.recommendations[0].text = 'changed';
  assert.notEqual(personalise(input).recommendations[0].text, 'changed');
  assert.deepEqual(input, SCENARIOS[0].scores);
});
