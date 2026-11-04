export const LOCATIONS = ['Pantry', 'Fridge', 'Freezer', 'Fruit bowl', 'Other'];
export const DATE_TYPES = ['Not recorded', 'Use by', 'Best before', 'Prepared on'];
export const CATEGORIES = ['Vegetables','Fruit','Grains','Dairy','Protein','Prepared meals','Other'];
export const LEFTOVER_STATES = ['Available','Frozen','Used','Discarded'];

export function validateFood(item) {
  const name = String(item.name ?? '').trim();
  const quantity = Number(item.quantity);
  const unit = String(item.unit ?? '').trim();
  const notes = String(item.notes ?? '').trim();
  if (!name || name.length > 100) throw new Error('Enter a food name of up to 100 characters.');
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000 || !/^\d+(\.\d{1,3})?$/.test(String(item.quantity))) throw new Error('Enter a quantity greater than zero, with up to three decimal places.');
  if (!unit || unit.length > 30) throw new Error('Enter a unit, such as items, g or portions (up to 30 characters).');
  if (!LOCATIONS.includes(item.location)) throw new Error('Choose a storage location.');
  if (!DATE_TYPES.includes(item.date_type)) throw new Error('Choose a food-date type.');
  const foodDate = item.food_date || null;
  if ((item.date_type === 'Not recorded') !== (foodDate === null)) throw new Error('Enter the food date or choose Not recorded.');
  if (foodDate && (!/^\d{4}-\d{2}-\d{2}$/.test(foodDate) || Number.isNaN(Date.parse(foodDate)) || new Date(foodDate).toISOString().slice(0, 10) !== foodDate)) throw new Error('Enter a valid food date.');
  if (notes.length > 500) throw new Error('Keep storage notes within 500 characters.');
  const category = item.category ?? 'Other';
  const status = item.leftover_status ?? 'Available';
  const planned = item.planned_use_date || null;
  if (!CATEGORIES.includes(category)) throw new Error('Choose a food category.');
  if (!LEFTOVER_STATES.includes(status) || (!item.is_leftover && planned)) throw new Error('Leftover details require a leftover item.');
  if (status === 'Frozen' && item.location !== 'Freezer') throw new Error('Frozen leftovers must be stored in Freezer.');
  if (planned && (!/^\d{4}-\d{2}-\d{2}$/.test(planned) || !Number.isFinite(Date.parse(planned)) || new Date(planned).toISOString().slice(0,10) !== planned)) throw new Error('Choose a valid planned-use date.');
  const dates = {};
  for (const key of ['purchase_date','prepared_date','stored_date']) {
    dates[key] = item[key] || null;
    if(dates[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(dates[key]) || !Number.isFinite(Date.parse(dates[key])) || new Date(dates[key]).toISOString().slice(0,10)!==dates[key])) throw new Error('Enter a valid purchase, preparation or storage date.');
  }
  const disposal_reason=String(item.disposal_reason??'').trim();
  if(disposal_reason.length>300)throw new Error('Keep disposal reasons within 300 characters.');
  return { name, quantity, unit, location: item.location, date_type: item.date_type, food_date: foodDate, use_first: !!item.use_first, is_leftover: !!item.is_leftover, notes, category, leftover_status: status, planned_use_date: planned, ...dates, disposal_reason };
}

export function visibleFood(items, filter) {
  return items.filter((item) => !['Used','Discarded'].includes(item.leftover_status)).filter((item) => filter === 'All items' || (filter === 'Use first' ? item.use_first : filter === 'Leftovers' ? item.is_leftover : item.location === filter))
    .sort((a, b) => Number(b.use_first) - Number(a.use_first) || (a.food_date ?? '9999').localeCompare(b.food_date ?? '9999') || a.name.localeCompare(b.name));
}
