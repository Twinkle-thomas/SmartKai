import { todayInNZ } from './meals.js';
export function foodDateStatus(item, now = new Date(), horizon = 3) {
  if (!item.food_date || !['Use by','Best before'].includes(item.date_type)) return { key: 'undated', label: item.date_type === 'Prepared on' ? 'Preparation date recorded' : 'No expiry date recorded' };
  const days = Math.round((Date.parse(item.food_date) - Date.parse(todayInNZ(now))) / 86400000);
  const key = days < 0 ? 'passed' : days === 0 ? 'today' : days <= horizon ? 'soon' : 'later';
  const label = days < 0 ? `${item.date_type} date passed` : days === 0 ? `${item.date_type} today` : `${item.date_type} in ${days} days`;
  return { key, days, label };
}
export function isActiveFood(item) { return !['Used','Discarded'].includes(item.leftover_status); }
