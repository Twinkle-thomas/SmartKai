import { CATEGORIES } from './pantry.js';
export function validateShoppingItem(item) {
  const name = String(item.name ?? '').trim();
  const quantity = Number(item.quantity);
  const unit = String(item.unit ?? '').trim();
  const notes = String(item.notes ?? '').trim();
  if (!name || name.length > 100) throw new Error('Enter an item name of up to 100 characters.');
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000 || !/^\d+(\.\d{1,3})?$/.test(String(item.quantity))) throw new Error('Enter a positive quantity with up to three decimal places.');
  if (!unit || unit.length > 30) throw new Error('Enter a unit of up to 30 characters, such as items, g or bags.');
  if (notes.length > 500) throw new Error('Keep notes within 500 characters.');
  if (typeof item.purchased !== 'boolean') throw new Error('Choose whether the item has been purchased.');
  const category=item.category??'Other';
  const cost=item.cost_nzd==null||item.cost_nzd===''?null:Number(item.cost_nzd);
  if(!CATEGORIES.includes(category))throw new Error('Choose a shopping category.');
  if(cost!==null&&(!Number.isFinite(cost)||cost<0||cost>100000||Math.abs(cost*100-Math.round(cost*100))>0.00001))throw new Error('Enter an NZD cost between 0 and 100000 with up to two decimals.');
  return { name, quantity, unit, notes, purchased: item.purchased, category, cost_nzd:cost };
}

export function matchingPantryItems(name, items) {
  const normalize = (text) => text.trim().toLocaleLowerCase('en-NZ').replace(/\s+/g, ' ');
  const target = normalize(name);
  return target ? items.filter((item) => normalize(item.name) === target) : [];
}
