import { expect, test, vi } from 'vitest';
import { validateShoppingItem, matchingPantryItems } from '../src/domain/shopping.js';
import { createShoppingService } from '../src/services/shopping.js';
import { RECOMMENDATION_TOOLS } from '../src/presentation/recommendationTools.js';
import { REMINDER_TASKS } from '../src/domain/reminders.js';
import { readRoute } from '../src/navigation.js';
const valid = { name: ' Apples ', quantity: '4', unit: 'items', notes: '', purchased: false };
test('shopping validates bounded text, positive quantities and explicit purchase status', () => {
  expect(validateShoppingItem(valid)).toMatchObject({ name: 'Apples', quantity: 4 });
  for (const patch of [{ name: ' ' }, { quantity: 0 }, { quantity: '-1' }, { quantity: '2.0001' }, { unit: '' }, { notes: 'x'.repeat(501) }, { purchased: 'true' }]) expect(() => validateShoppingItem({ ...valid, ...patch })).toThrow();
});
test('pantry matches only normalize case and whitespace without guessing quantities or equivalents', () => {
  const stock = [{ name: '  Red   Apples ', quantity: 2 }, { name: 'Red apple', quantity: 9 }];
  expect(matchingPantryItems('red apples', stock)).toEqual([stock[0]]);
  expect(matchingPantryItems('apples', stock)).toEqual([]);
  expect(matchingPantryItems(' ', stock)).toEqual([]);
});
test('shopping service scopes every mutation and verifies a returned row', async () => {
  const query = {};
  for (const method of ['select','eq','order','insert','update','delete']) query[method] = vi.fn(() => query);
  query.limit = vi.fn().mockResolvedValue({ data: [], error: null });
  query.single = vi.fn().mockResolvedValue({ data: { id: 'shopping-a' }, error: null });
  const client = { from: vi.fn(() => query) };
  const service = createShoppingService(client, 'owner-a');
  await service.list(); await service.save(valid); await service.save(valid, 'shopping-a');
  expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Apples', owner_id: 'owner-a' }));
  expect(query.eq).toHaveBeenCalledWith('owner_id', 'owner-a');
  expect(query.eq).toHaveBeenCalledWith('id', 'shopping-a');
  await service.setPurchased('shopping-a', true);
  expect(query.update).toHaveBeenCalledWith({ purchased: true });
  query.single.mockResolvedValue({ data: null, error: null });
  await expect(service.remove('foreign')).rejects.toThrow();
  await expect(service.setPurchased('foreign', false)).rejects.toThrow();
  await expect(createShoppingService(client, null).list()).rejects.toThrow('Sign in');
});
test('shopping recommendations and reminder actions open the working list route', () => {
  expect(readRoute(RECOMMENDATION_TOOLS['check-before-shopping'].href)).toBe('shopping');
  expect(readRoute(REMINDER_TASKS.find(({ key }) => key === 'shopping').href)).toBe('shopping');
});
