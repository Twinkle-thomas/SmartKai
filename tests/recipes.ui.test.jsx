import React from 'react';
import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PantryRecipes from '../src/components/PantryRecipes.jsx';
import MealPlanner from '../src/components/MealPlanner.jsx';
import { todayInNZ } from '../src/domain/meals.js';
const stock = [
  { id: 'carrots', name: 'Carrots', quantity: 400, unit: 'g', location: 'Fridge', use_first: false },
  { id: 'lentils', name: 'Red lentils', quantity: 200, unit: 'g', location: 'Pantry', use_first: false },
  { id: 'onion', name: 'Onion', quantity: 1, unit: 'item', location: 'Pantry', use_first: false },
  { id: 'stock', name: 'Vegetable stock', quantity: 750, unit: 'ml', location: 'Pantry', use_first: false },
];
const mocks = vi.hoisted(() => ({ save: vi.fn(), list: vi.fn().mockResolvedValue([]), pantry: vi.fn() }));
vi.mock('../src/services/meals.js', () => ({ createMealService: () => mocks }));
vi.mock('../src/services/pantry.js', () => ({ createPantryService: () => ({ list: mocks.pantry }) }));
test('recipe ideas disclose matched/missing ingredients and selection is deliberate', async () => {
  const choose = vi.fn(); const user = userEvent.setup();
  render(<PantryRecipes stock={stock.slice(0, 2)} state="ready" onChoose={choose} />);
  expect(screen.getByText(/Onion, Vegetable stock. Check stock before shopping/)).toBeInTheDocument();
  expect(choose).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Plan Carrot and red lentil soup' }));
  expect(choose).toHaveBeenCalledWith(expect.objectContaining({ id: 'carrot-lentil-soup' }));
});
test('a pantry recipe becomes an editable meal draft and is saved only after confirmation', async () => {
  mocks.pantry.mockResolvedValue(stock); mocks.save.mockResolvedValue({ id: 'recipe-meal' });
  const user = userEvent.setup(); render(<MealPlanner client={{}} userId="recipe-evaluator" />);
  await user.click(await screen.findByRole('button', { name: 'Plan Carrot and red lentil soup' }));
  expect(screen.getByLabelText('Meal name')).toHaveValue('Carrot and red lentil soup');
  expect(screen.getByLabelText('Ingredient notes').value).toContain('Carrots: 300 g');
  expect(screen.getByLabelText('Planned portions')).toHaveValue(2);
  expect(screen.getByLabelText('Meal date')).toHaveValue(todayInNZ());
  expect(mocks.save).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Save meal plan' }));
  await screen.findByText('Meal planned.');
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Carrot and red lentil soup', portions: '2' }), null);
});
