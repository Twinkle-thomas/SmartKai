import { expect, test, vi } from 'vitest';
import { addIngredient, todayInNZ, validateMeal, weekDates } from '../src/domain/meals.js';
import { createMealService } from '../src/services/meals.js';
import { RECOMMENDATION_TOOLS } from '../src/presentation/recommendationTools.js';
import { REMINDER_TASKS } from '../src/domain/reminders.js';
const valid = { name: ' Vegetable soup ', meal_date: '2026-11-03', meal_slot: 'Dinner', portions: '2', ingredients: 'Carrots', notes: '', includes_leftovers: false };
test('meal validation requires real dates, integer portions, valid slots and bounded notes', () => {
  expect(validateMeal(valid)).toMatchObject({ name: 'Vegetable soup', portions: 2 });
  for (const patch of [{ name: '' }, { meal_date: '2026-02-30' }, { meal_date: '1999-12-31' }, { meal_slot: 'Midnight' }, { portions: 0 }, { portions: 1.5 }, { portions: 51 }, { ingredients: 'x'.repeat(2001) }, { includes_leftovers: 'true' }]) expect(() => validateMeal({ ...valid, ...patch })).toThrow();
});
test('weekly date ranges are Monday to Sunday across year and daylight-saving boundaries', () => {
  expect(weekDates('2026-01-01')).toEqual(['2025-12-29','2025-12-30','2025-12-31','2026-01-01','2026-01-02','2026-01-03','2026-01-04']);
  expect(weekDates('2026-09-27')).toEqual(['2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25','2026-09-26','2026-09-27']);
  expect(todayInNZ(new Date('2026-11-02T12:00:00Z'))).toBe('2026-11-03');
  expect(() => weekDates('not-a-date')).toThrow();
});
test('pantry ingredient names are notes, deduplicated and bounded rather than inventory allocations', () => {
  expect(addIngredient('Carrots', 'Rice')).toBe('Carrots\nRice');
  expect(addIngredient('Carrots', ' carrots ')).toBe('Carrots');
  expect(() => addIngredient('x'.repeat(2000), 'Rice')).toThrow();
});
test('meal service scopes dates and ownership and rejects unconfirmed mutations', async () => {
  const query = {};
  for (const method of ['select','eq','gte','lte','order','insert','update','delete']) query[method] = vi.fn(() => query);
  query.limit = vi.fn().mockResolvedValue({ data: [], error: null });
  query.single = vi.fn().mockResolvedValue({ data: { id: 'meal-a' }, error: null });
  const service = createMealService({ from: vi.fn(() => query) }, 'owner-a');
  await service.list('2026-11-03');
  expect(query.eq).toHaveBeenCalledWith('owner_id', 'owner-a');
  expect(query.gte).toHaveBeenCalledWith('meal_date', '2026-11-02'); expect(query.lte).toHaveBeenCalledWith('meal_date', '2026-11-08');
  await service.save(valid); await service.save(valid, 'meal-a');
  expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: 'owner-a', portions: 2 }));
  expect(query.update.mock.calls[0][0]).not.toHaveProperty('owner_id');
  expect(query.eq).toHaveBeenCalledWith('id', 'meal-a');
  query.single.mockResolvedValue({ data: null, error: null });
  await expect(service.remove('foreign')).rejects.toThrow();
  await expect(createMealService(null, null).list('2026-11-03')).rejects.toThrow('Sign in');
});
test('planning profiles and weekly reminder actions point to the meal planner', () => {
  expect(RECOMMENDATION_TOOLS['plan-before-shopping'].href).toBe('#/meals');
  expect(RECOMMENDATION_TOOLS['plan-leftover-use'].href).toBe('#/leftovers');
  expect(REMINDER_TASKS.find(({ key }) => key === 'meal-planning').href).toBe('#/meals');
});
