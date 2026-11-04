import { expect, test } from 'vitest';
import { FOOD_CLASSES, foodSuggestions, PHOTO_LIMIT, validateFoodPhoto } from '../src/domain/foodRecognition.js';

test('only supported high-scoring food labels are suggested, without inferred quantities or dates', () => {
  const result = foodSuggestions([
    { class: 'apple', score: 0.9 }, { class: 'apple', score: 0.8 },
    { class: 'carrot', score: 0.5 }, { class: 'bottle', score: 0.99 },
    { class: 'person', score: 0.99 }, { class: 'banana', score: 0.49 },
    { class: 'cake', score: NaN }, { class: 'pizza', score: 1.1 },
  ]);
  expect(result).toEqual([{ key: 'apple', name: 'Apple' }, { key: 'carrot', name: 'Carrot' }]);
  expect(Object.keys(FOOD_CLASSES)).toHaveLength(10);
  expect(foodSuggestions([{ class: 'refrigerator', score: 0.99 }])).toEqual([]);
  expect(result[0]).not.toHaveProperty('quantity');
  expect(result[0]).not.toHaveProperty('food_date');
});
test('uploads accept only bounded JPEG, PNG and WebP images', () => {
  for (const type of ['image/jpeg','image/png','image/webp']) expect(() => validateFoodPhoto({ type, size: 1024 })).not.toThrow();
  for (const file of [null, { type: 'image/svg+xml', size: 200 }, { type: 'image/heic', size: 200 }, { type: 'image/jpeg', size: 0 }, { type: 'image/png', size: PHOTO_LIMIT + 1 }]) expect(() => validateFoodPhoto(file)).toThrow();
});
