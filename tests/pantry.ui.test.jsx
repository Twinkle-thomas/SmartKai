import React from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pantry from '../src/components/Pantry.jsx';
import Progress from '../src/components/Progress.jsx';
import { RULE_VERSION } from '../src/domain/personalisation.js';

const mocks = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn(), remove: vi.fn(), progress: vi.fn() }));
vi.mock('../src/services/pantry.js', () => ({ createPantryService: () => mocks }));
vi.mock('../src/services/progress.js', () => ({ createProgressService: () => ({ load: mocks.progress }) }));
beforeEach(() => { vi.resetAllMocks(); mocks.list.mockResolvedValue([]); });
const carrot = { id: 'carrot', name: 'Carrots', quantity: 500, unit: 'g', location: 'Fridge', date_type: 'Best before', food_date: '2026-11-10', use_first: true, is_leftover: false, notes: 'Keep packaging instructions' };

test('pantry supports saved add, edit, use-first filter and confirmed delete', async () => {
  let entries = [];
  mocks.list.mockImplementation(async () => entries);
  mocks.save.mockImplementation(async (item, id) => { entries = [{ ...item, id: id ?? 'carrot' }]; });
  mocks.remove.mockImplementation(async () => { entries = []; });
  const user = userEvent.setup(); render(<Pantry client={{}} userId="A" />);
  await screen.findByText('No food items in this view yet.');
  await user.type(screen.getByLabelText('Food name'), 'Carrots');
  await user.clear(screen.getByLabelText('Quantity')); await user.type(screen.getByLabelText('Quantity'), '500');
  await user.clear(screen.getByLabelText('Unit')); await user.type(screen.getByLabelText('Unit'), 'g');
  await user.selectOptions(screen.getByLabelText('Storage location'), 'Fridge');
  await user.selectOptions(screen.getByLabelText('Food-date type'), 'Best before');
  await user.type(screen.getByLabelText('Food date'), '2026-11-10');
  await user.click(screen.getByLabelText('Use first'));
  await user.click(screen.getByRole('button', { name: 'Add food item', exact: true }));
  await screen.findByText('Food item added.');
  await screen.findByRole('button', { name: 'Edit Carrots' });
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Carrots', quantity: '500', use_first: true }), null);
  await user.click(screen.getByRole('button', { name: 'Edit Carrots' }));
  expect(screen.getByLabelText('Food name')).toHaveFocus();
  await user.clear(screen.getByLabelText('Quantity')); await user.type(screen.getByLabelText('Quantity'), '250');
  await user.click(screen.getByRole('button', { name: 'Update food item' }));
  await screen.findByText('250 g');
  await user.selectOptions(screen.getByLabelText('Show food'), 'Leftovers');
  await screen.findByText('No food items in this view yet.');
  await user.selectOptions(screen.getByLabelText('Show food'), 'Use first');
  await user.click(screen.getByRole('button', { name: 'Delete Carrots' }));
  expect(mocks.remove).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Keep item' }));
  expect(mocks.remove).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Delete Carrots' }));
  await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
  await screen.findByText('Food item deleted.');
  await screen.findByText('No food items in this view yet.');
});

test('pantry load and save errors remain visible with retry and no optimistic success', async () => {
  mocks.list.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([carrot]);
  mocks.save.mockRejectedValue(new Error('offline'));
  const user = userEvent.setup(); render(<Pantry client={{}} userId="A" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load pantry');
  await user.click(screen.getByRole('button', { name: 'Refresh pantry' }));
  await user.click(await screen.findByRole('button', { name: 'Edit Carrots' }));
  await user.click(screen.getByRole('button', { name: 'Update food item' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('change could not be confirmed');
  expect(screen.getByLabelText('Food name')).toHaveValue('Carrots');
  expect(screen.queryByText('Food item updated.')).not.toBeInTheDocument();
});

test('signed-out pantry cannot edit food', () => {
  render(<Pantry client={{}} />);
  expect(screen.getByRole('link', { name: 'Sign in to manage pantry' })).toHaveAttribute('href', '#/login');
  expect(screen.queryByLabelText('Food name')).not.toBeInTheDocument();
  expect(mocks.list).not.toHaveBeenCalled();
});

test('check-in shows comparison and starts a fresh assessment intentionally', async () => {
  const baseline = { id: '1', created_at: '2026-01-01T00:00:00Z', rule_version: RULE_VERSION, scenario_key: null, overbuying: 2, forgetting_food: 2, poor_meal_planning: 2, discarding_leftovers: 2, storage_uncertainty: 2 };
  mocks.progress.mockResolvedValue({ baseline, latest: { ...baseline, id: '2', created_at: '2026-02-01T00:00:00Z', overbuying: 0 } });
  const reset = vi.fn(); window.addEventListener('smartkai:new-check-in', reset);
  try {
    const user = userEvent.setup(); render(<Progress client={{}} userId="A" />);
    await screen.findByText('The reported habit score is 2 points lower.');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(6);
    await user.click(screen.getByRole('link', { name: 'Take a fresh assessment' }));
    expect(reset).toHaveBeenCalledTimes(1);
  } finally { window.removeEventListener('smartkai:new-check-in', reset); }
});

test('no saved baseline prompts completion, while failed progress loads offer retry', async () => {
  mocks.progress.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ baseline: null, latest: null });
  const user = userEvent.setup(); render(<Progress client={{}} userId="A" />);
  await screen.findByRole('alert');
  await user.click(screen.getByRole('button', { name: 'Reload check-in' }));
  expect(await screen.findByRole('link', { name: 'Complete your first assessment' })).toHaveAttribute('href', '#/personalisation');
});
