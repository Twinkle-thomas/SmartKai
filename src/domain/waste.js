import { CATEGORIES } from './pantry.js';
import { todayInNZ } from './meals.js';

export const DISCARD_REASONS = ['Spoiled or expired', 'Bought too much', 'Prepared too much', 'Forgotten food', 'Storage problem', 'Other'];
export const REASON_ADVICE = {
  'Bought too much': { profile: 'Overbuyer', text: 'Check pantry quantities before shopping.', href: '#/shopping' },
  'Forgotten food': { profile: 'Food Forgetter', text: 'Review your use-first food regularly.', href: '#/pantry/use-first' },
  'Prepared too much': { profile: 'Leftover Discarder', text: 'Review portions and make a plan for suitable leftovers.', href: '#/leftovers' },
  'Storage problem': { profile: 'Storage Learner', text: 'Check packaging and sourced storage guidance.', href: '#/storage' },
};
export function validWasteDate(value) {
  return typeof value === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
export function shiftDate(date, days) { return new Date(Date.parse(date) + days * 86400000).toISOString().slice(0,10); }
export function weekStart(date) {
  if (!validWasteDate(date)) throw new Error('Choose a valid date from 2000–2099.');
  const day = new Date(date).getUTCDay();
  return shiftDate(date, -(day + 6) % 7);
}
// Exact SI mass relationships only. No density, serving or item-weight assumptions.
export function kilograms(quantity, unit) {
  if (quantity === '' || quantity == null || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) return null;
  const factors = { kg: 1, g: .001, mg: .000001 };
  const factor = factors[String(unit ?? '').trim().toLowerCase()];
  return factor == null ? null : Number((Number(quantity) * factor).toFixed(12));
}
export function validateDiscard(input, today = todayInNZ()) {
  const result = { event_date: input.event_date, food_name: String(input.food_name ?? '').trim(), category: input.category, quantity: Number(input.quantity), unit: String(input.unit ?? '').trim(), reason: String(input.reason ?? '').trim(), notes: String(input.notes ?? '').trim() };
  if (!validWasteDate(result.event_date) || result.event_date > today) throw new Error('Choose a valid discard date, no later than today.');
  if (!result.food_name || result.food_name.length > 100) throw new Error('Enter a food name (up to 100 characters).');
  if (!CATEGORIES.includes(result.category)) throw new Error('Choose a food category.');
  if (!/^\d+(\.\d{1,3})?$/.test(String(input.quantity)) || result.quantity <= 0 || result.quantity > 100000) throw new Error('Enter an amount greater than zero, up to three decimal places.');
  if (!result.unit || result.unit.length > 30) throw new Error('Enter a unit (up to 30 characters).');
  if (!result.reason || result.reason.length > 300) throw new Error('Enter a discard reason (up to 300 characters).');
  if (result.notes.length > 500) throw new Error('Keep notes within 500 characters.');
  return result;
}
export function periodSummary(events, start) {
  const end = shiftDate(start,6);
  const rows = events.filter(e => e.outcome === 'Discarded' && validWasteDate(e.event_date) && e.event_date >= start && e.event_date <= end);
  let kg = 0, measured = 0;
  const categories = {}, reasons = {};
  for (const row of rows) {
    const mass = kilograms(row.quantity,row.unit);
    if (mass != null) { kg += mass; measured++; }
    for (const [groups,key] of [[categories,row.category || 'Other'],[reasons,row.reason || 'Not recorded']]) {
      groups[key] ??= { count: 0, kg: 0, unmeasured: 0 };
      groups[key].count++;
      if (mass == null) groups[key].unmeasured++; else groups[key].kg += mass;
    }
  }
  return { start, end, count: rows.length, kg: measured ? Number(kg.toFixed(12)) : null, unmeasured: rows.length - measured, categories, reasons };
}
export function compareWaste(baseline, current, today = todayInNZ()) {
  const unavailable = message => ({ percent: null, message });
  if (baseline.end >= current.start && current.end >= baseline.start) return unavailable('Select separate, non-overlapping weeks.');
  if (baseline.end >= today || current.end >= today) return unavailable('Compare completed seven-day periods only.');
  if (!baseline.count || !current.count) return unavailable('No comparison: a period has no logs. Missing logs are not zero waste.');
  if (baseline.unmeasured || current.unmeasured) return unavailable('No percentage: a period contains quantities unmeasured in kilograms.');
  if (baseline.kg === 0 || baseline.kg == null) return unavailable('No percentage: baseline is zero or unavailable.');
  const percent = Number(((current.kg - baseline.kg) / baseline.kg * 100).toFixed(2));
  return { percent, message: percent === 0 ? 'Recorded mass is unchanged.' : `Recorded mass is ${Math.abs(percent)}% ${percent < 0 ? 'lower' : 'higher'}.` };
}
