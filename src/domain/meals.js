export const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
export function validMealDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '2000-01-01' && value <= '2100-12-31' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function todayInNZ(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function weekDates(date) {
  if (!validMealDate(date)) throw new Error('Choose a valid date between 2000 and 2100.');
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => new Date(day.getTime() + i * 86400000).toISOString().slice(0, 10));
}
export function mealDateLabel(date) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-NZ', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
}
export function validateMeal(item) {
  const name = String(item.name ?? '').trim();
  const ingredients = String(item.ingredients ?? '').trim();
  const notes = String(item.notes ?? '').trim();
  const portions = Number(item.portions);
  if (!name || name.length > 100) throw new Error('Enter a meal name of up to 100 characters.');
  if (!validMealDate(item.meal_date)) throw new Error('Choose a valid meal date between 2000 and 2100.');
  if (!MEAL_SLOTS.includes(item.meal_slot)) throw new Error('Choose a meal time.');
  if (!Number.isInteger(portions) || portions < 1 || portions > 50) throw new Error('Choose between 1 and 50 portions.');
  if (ingredients.length > 2000 || notes.length > 500) throw new Error('Keep ingredients within 2000 characters and notes within 500.');
  if (typeof item.includes_leftovers !== 'boolean') throw new Error('Choose whether this meal uses leftovers.');
  return { name, meal_date: item.meal_date, meal_slot: item.meal_slot, portions, ingredients, notes, includes_leftovers: item.includes_leftovers };
}
export function addIngredient(notes, name) {
  if (notes.split('\n').some((line) => line.trim().toLocaleLowerCase('en-NZ') === name.trim().toLocaleLowerCase('en-NZ'))) return notes;
  const next = [notes.trim(), name.trim()].filter(Boolean).join('\n');
  if (next.length > 2000) throw new Error('Ingredient notes are full. Edit them before adding more food.');
  return next;
}
