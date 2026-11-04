import { INDICATORS, RULE_VERSION } from './personalisation.js';
export const SCORE_COLUMNS = ['overbuying', 'forgetting_food', 'poor_meal_planning', 'discarding_leftovers', 'storage_uncertainty'];
const DAY = 86400000;

export function progressSummary(baseline, latest, now = new Date()) {
  if (!baseline || !latest) return null;
  const valid = (record) => !record.scenario_key && record.rule_version === RULE_VERSION && Number.isFinite(Date.parse(record.created_at)) && SCORE_COLUMNS.every((key) => Number.isInteger(record[key]) && record[key] >= 0 && record[key] <= 2);
  if (!valid(baseline) || !valid(latest) || Date.parse(latest.created_at) < Date.parse(baseline.created_at)) throw new Error('These assessments cannot be compared using the current rules.');
  const rows = INDICATORS.map(({ profile }, i) => ({ profile, before: baseline[SCORE_COLUMNS[i]], after: latest[SCORE_COLUMNS[i]] }));
  const before = rows.reduce((sum, row) => sum + row.before, 0);
  const after = rows.reduce((sum, row) => sum + row.after, 0);
  const elapsedDays = Math.floor((Date.parse(latest.created_at) - Date.parse(baseline.created_at)) / DAY);
  const dueAt = new Date(Date.parse(latest.created_at) + 30 * DAY);
  return { rows, before, after, change: after - before, elapsedDays, hasFollowUp: baseline.id !== latest.id, dueAt, due: now >= dueAt, early: baseline.id !== latest.id && elapsedDays < 30 };
}
