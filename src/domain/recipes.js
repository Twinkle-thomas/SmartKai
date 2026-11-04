import { RECIPES } from '../data/recipes.js';
import { foodDateStatus,isActiveFood } from './foodDates.js';
const normalize = (value) => value.trim().toLocaleLowerCase('en-NZ').replace(/\s+/g, ' ');
export function pantryRecipes(stock) {
  const names = new Set(stock.filter(item=>isActiveFood(item)&&!(item.date_type==='Use by'&&foodDateStatus(item).key==='passed')).map(({ name }) => normalize(name)));
  return RECIPES.map((recipe) => {
    const matched = recipe.ingredients.filter(({ aliases }) => aliases.some((alias) => names.has(normalize(alias))));
    const missing = recipe.ingredients.filter((entry) => !matched.includes(entry));
    return { recipe, matched, missing };
  }).filter(({ matched }) => matched.length >= 2)
    .sort((a, b) => a.missing.length - b.missing.length || b.matched.length - a.matched.length || a.recipe.name.localeCompare(b.recipe.name));
}
export function recipeDraft(recipe) {
  return {
    name: recipe.name,
    portions: String(recipe.serves),
    ingredients: recipe.ingredients.map(({ name, quantity, unit }) => `${name}: ${quantity} ${unit}`).join('\n'),
    notes: recipe.steps.map((text, i) => `${i + 1}. ${text}`).join('\n'),
    includes_leftovers: false,
  };
}
