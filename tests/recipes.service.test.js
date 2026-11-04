import { expect, test } from 'vitest';
import { RECIPES } from '../src/data/recipes.js';
import { pantryRecipes, recipeDraft } from '../src/domain/recipes.js';
import { validateMeal } from '../src/domain/meals.js';
test('recipe ideas use two distinct ingredient types and rank complete name matches first', () => {
  const stock = [{ name: ' CARROTS ' }, { name: 'Red lentils' }, { name: 'Onion' }, { name: 'Vegetable stock' }];
  const ideas = pantryRecipes(stock);
  expect(ideas[0].recipe.id).toBe('carrot-lentil-soup');
  expect(ideas[0].missing).toEqual([]); expect(ideas[0].matched).toHaveLength(4);
  expect(pantryRecipes([{ name: 'Onion' }, { name: 'ONION' }])).toEqual([]);
  expect(pantryRecipes([{ name: 'Pineapple' }, { name: 'Hand soap' }])).toEqual([]);
  const partial = pantryRecipes([{ name: 'Carrots' }, { name: 'Red lentils' }])[0];
  expect(partial.missing.map(({ name }) => name)).toEqual(['Onion','Vegetable stock']);
});
test('recipes are bounded valid meal drafts and do not infer quantities from inventory', () => {
  for (const recipe of RECIPES) expect(() => validateMeal({ ...recipeDraft(recipe), meal_date: '2026-11-04', meal_slot: 'Dinner' })).not.toThrow();
  const ideas = pantryRecipes([{ name: 'Carrots', quantity: 1, unit: 'g' }, { name: 'Red lentils', quantity: 1, unit: 'g' }]);
  expect(ideas).toHaveLength(1); // name matches only: not a sufficiency claim
  expect(recipeDraft(ideas[0].recipe).ingredients).toContain('Carrots: 300 g');
  expect(recipeDraft(ideas[0].recipe)).not.toHaveProperty('meal_date');
});
