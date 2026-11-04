import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FoodPhotoImport from '../src/components/FoodPhotoImport.jsx';
import Pantry from '../src/components/Pantry.jsx';

const mocks = vi.hoisted(() => ({ recognize: vi.fn(), save: vi.fn(), list: vi.fn().mockResolvedValue([]) }));
vi.mock('../src/services/foodRecognition.js', () => ({ recognizeFood: mocks.recognize }));
vi.mock('../src/services/pantry.js', () => ({ createPantryService: () => ({ save: mocks.save, list: mocks.list }) }));
beforeEach(() => {
  vi.clearAllMocks(); mocks.recognize.mockResolvedValue([{ key: 'apple', name: 'Apple' }]);
  URL.createObjectURL = vi.fn().mockReturnValue('blob:food-photo-test'); URL.revokeObjectURL = vi.fn();
});
afterEach(() => { delete URL.createObjectURL; delete URL.revokeObjectURL; });
const photo = () => new File(['test-image'], 'food.jpg', { type: 'image/jpeg' });
async function upload(user) {
  await user.upload(await screen.findByLabelText('Upload a food photo'), photo());
  fireEvent.load(await screen.findByAltText('Your selected food photo for local analysis'));
}

test('photo analysis is deliberate and suggestions populate a review form without saving', async () => {
  const review = vi.fn(); const user = userEvent.setup(); render(<FoodPhotoImport onReview={review} />);
  await user.click(screen.getByText('Add food from a photo', { exact: false }).closest('summary'));
  expect(mocks.recognize).not.toHaveBeenCalled();
  await upload(user);
  expect(mocks.recognize).not.toHaveBeenCalled();
  await user.selectOptions(screen.getByLabelText('Where is this food stored?'), 'Freezer');
  await user.click(screen.getByRole('button', { name: 'Find possible foods' }));
  await user.click(await screen.findByRole('button', { name: 'Review Apple' }));
  expect(review).toHaveBeenCalledWith(expect.objectContaining({ name: 'Apple', quantity: '', unit: '', location: 'Freezer', date_type: 'Not recorded', food_date: '' }));
  expect(mocks.save).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Remove photo' }));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:food-photo-test');
  expect(screen.queryByRole('button', { name: 'Review Apple' })).not.toBeInTheDocument();
});
test('unsupported files, undecodable photos and empty recognition results offer manual entry', async () => {
  const user = userEvent.setup({ applyAccept: false }); render(<FoodPhotoImport onReview={vi.fn()} />);
  await user.click(screen.getByText('Add food from a photo', { exact: false }).closest('summary'));
  await user.upload(screen.getByLabelText('Upload a food photo'), new File(['svg'], 'test.svg', { type: 'image/svg+xml' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Choose a JPEG');
  await upload(user);
  fireEvent.error(screen.getByAltText('Your selected food photo for local analysis'));
  expect(screen.getByRole('alert')).toHaveTextContent('could not be opened');
  expect(screen.getByRole('button', { name: 'Find possible foods' })).toBeDisabled();
  await upload(user); mocks.recognize.mockResolvedValue([]);
  await user.click(screen.getByRole('button', { name: 'Find possible foods' }));
  expect(await screen.findByText(/No supported foods found/)).toBeInTheDocument();
  expect(mocks.save).not.toHaveBeenCalled();
});
test('failed model analysis can be retried without a simulated fallback', async () => {
  mocks.recognize.mockRejectedValueOnce(new Error('offline'));
  const user = userEvent.setup(); render(<FoodPhotoImport onReview={vi.fn()} />);
  await user.click(screen.getByText('Add food from a photo', { exact: false }).closest('summary'));
  await upload(user); await user.click(screen.getByRole('button', { name: 'Find possible foods' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not analyse');
  expect(screen.queryByRole('button', { name: 'Review Apple' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Try analysis again' }));
  expect(await screen.findByRole('button', { name: 'Review Apple' })).toBeInTheDocument();
});
test('pantry requires explicit quantity and unit confirmation before a suggested food is saved', async () => {
  const user = userEvent.setup(); render(<Pantry client={{}} userId="test-account" />);
  await user.click((await screen.findByText('Add food from a photo', { exact: false })).closest('summary'));
  await upload(user); await user.click(screen.getByRole('button', { name: 'Find possible foods' }));
  await user.click(await screen.findByRole('button', { name: 'Review Apple' }));
  expect(screen.getByLabelText('Food name')).toHaveValue('Apple');
  expect(screen.getByLabelText('Quantity')).toHaveValue(null);
  expect(screen.getByLabelText('Food-date type')).toHaveValue('Not recorded');
  expect(mocks.save).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('Quantity'), '3');
  await user.type(screen.getByLabelText('Unit'), 'items');
  await user.click(screen.getByRole('button', { name: 'Add food item', exact: true }));
  await screen.findByText('Food item added.');
  expect(mocks.save).toHaveBeenCalledTimes(1);
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Apple', quantity: '3', unit: 'items', food_date: '' }), null);
});
