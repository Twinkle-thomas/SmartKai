import { expect, test } from 'vitest';
import { validateFood, visibleFood } from '../src/domain/pantry.js';
import { progressSummary, SCORE_COLUMNS } from '../src/domain/progress.js';
import { SCENARIOS } from '../src/data/scenarios.js';
import { INDICATORS, personalise, RULE_VERSION } from '../src/domain/personalisation.js';
import { RECOMMENDATION_TOOLS } from '../src/presentation/recommendationTools.js';
import { readRoute } from '../src/navigation.js';

const food = { name: ' Carrots ', quantity: '0.5', unit: 'kg', location: 'Fridge', date_type: 'Best before', food_date: '2026-11-12', notes: 'Keep label instructions', use_first: true };
test('inventory validates quantities, dates and bounded text before persistence', () => {
  expect(validateFood(food)).toMatchObject({ name: 'Carrots', quantity: 0.5 });
  for (const patch of [{ quantity: '0' }, { quantity: '-2' }, { quantity: '1.0001' }, { quantity: 'Infinity' }, { name: '' }, { food_date: '2026-02-30' }, { food_date: '' }, { date_type: 'Not recorded' }, { location: 'Unknown' }, { notes: 'x'.repeat(501) }]) expect(() => validateFood({ ...food, ...patch })).toThrow();
});
test('use-first, leftover and storage views show only matching inventory', () => {
  const entries = [{ ...food, name: 'Carrots', is_leftover: false }, { ...food, name: 'Soup', is_leftover: true, use_first: false }];
  expect(visibleFood(entries, 'Use first').map(({ name }) => name)).toEqual(['Carrots']);
  expect(visibleFood(entries, 'Leftovers').map(({ name }) => name)).toEqual(['Soup']);
  expect(visibleFood(entries, 'Freezer')).toEqual([]);
});
test('every scenario recommendation opens a real internal tool route', () => {
  for (const scenario of SCENARIOS) for (const recommendation of personalise(scenario.scores).recommendations) {
    const tool = RECOMMENDATION_TOOLS[recommendation.id];
    expect(tool).toBeDefined(); expect(['pantry','shopping','meals','leftovers','storage']).toContain(readRoute(tool.href));
  }
});
const record = (id, day, values) => ({ id, created_at: `2026-${day}T00:00:00Z`, rule_version: RULE_VERSION, scenario_key: null, ...Object.fromEntries(SCORE_COLUMNS.map((column, i) => [column, values[i]])) });
test('monthly check-in compares an unchanged baseline, allows general guidance and detects direction', () => {
  const baseline = record('a', '01-01', [2,2,2,2,2]);
  const latest = record('b', '02-01', [0,1,0,1,0]);
  const result = progressSummary(baseline, latest, new Date('2026-03-04'));
  expect(result).toMatchObject({ before: 10, after: 2, change: -8, elapsedDays: 31, due: true, early: false });
  expect(result.rows.map(({ profile }) => profile)).toEqual(INDICATORS.map(({ profile }) => profile));
  expect(progressSummary(latest, latest).hasFollowUp).toBe(false);
  expect(progressSummary(record('a', '01-01', [0,0,0,0,0]), record('b', '01-10', [1,1,1,1,1]))).toMatchObject({ change: 5, early: true });
  expect(progressSummary(null, null)).toBeNull();
  expect(() => progressSummary(baseline, { ...latest, scenario_key: 'all-profiles' })).toThrow();
  expect(() => progressSummary(baseline, { ...latest, rule_version: 'different' })).toThrow();
  expect(baseline.overbuying).toBe(2);
});
test('check-in due boundary is exactly 30 days after the latest assessment', () => {
  const baseline = record('a', '01-01', [0,0,0,0,0]);
  expect(progressSummary(baseline, baseline, new Date('2026-01-30T23:59:59Z')).due).toBe(false);
  expect(progressSummary(baseline, baseline, new Date('2026-01-31T00:00:00Z')).due).toBe(true);
});
