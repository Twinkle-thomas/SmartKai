import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReceiptImport from '../src/components/ReceiptImport.jsx';
import Pantry from '../src/components/Pantry.jsx';
const mocks = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), list: vi.fn() }));
vi.mock('../src/services/receiptOcr.js', () => ({ readReceipt: mocks.read }));
vi.mock('../src/services/pantry.js', () => ({ createPantryService: () => ({ save: mocks.save, list: mocks.list }) }));
beforeEach(() => {
  vi.resetAllMocks(); mocks.read.mockResolvedValue('MILK 2L 4.50\nAPPLES 3.99\nTOTAL 8.49'); mocks.list.mockResolvedValue([]);
  URL.createObjectURL = vi.fn(() => 'blob:receipt-preview'); URL.revokeObjectURL = vi.fn();
});
afterEach(() => { delete URL.createObjectURL; delete URL.revokeObjectURL; });
async function upload(user) {
  await user.upload(screen.getByLabelText('Upload a receipt photo'), new File(['test-receipt'], 'receipt.jpg', { type: 'image/jpeg' }));
  fireEvent.load(await screen.findByAltText('Your selected receipt for local text extraction'));
}
test('receipt extraction requires an action, offers reviewed items without quantities and clears local data', async () => {
  const review = vi.fn(); const user = userEvent.setup(); render(<ReceiptImport onReview={review} />);
  await user.click(screen.getByText('Add food from a grocery receipt', { exact: false }).closest('summary'));
  await upload(user); expect(mocks.read).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Read receipt' }));
  await user.click(await screen.findByRole('button', { name: 'Review receipt item 1: MILK 2L' }));
  expect(review).toHaveBeenCalledWith(expect.objectContaining({ name: 'MILK 2L', quantity: '', unit: '', location: 'Other', date_type: 'Not recorded', notes: '' }));
  expect(mocks.save).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: /Review receipt item.*TOTAL/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Discard receipt item 2: APPLES' }));
  expect(screen.queryByRole('button', { name: /Review receipt item.*APPLES/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Clear receipt' }));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:receipt-preview');
  expect(screen.getByLabelText('Receipt text to review or paste')).toHaveValue('');
});
test('receipt text can be corrected and reparsed without pretending to recognise food', async () => {
  const user = userEvent.setup(); render(<ReceiptImport onReview={vi.fn()} />);
  await user.click(screen.getByText('Add food from a grocery receipt', { exact: false }).closest('summary'));
  await user.type(screen.getByLabelText('Receipt text to review or paste'), 'BREAD 2.80\nTOTAL 2.80');
  await user.click(screen.getByRole('button', { name: 'Find receipt items' }));
  expect(screen.getByRole('button', { name: 'Review receipt item 1: BREAD' })).toBeInTheDocument();
  await user.clear(screen.getByLabelText('Receipt text to review or paste'));
  expect(screen.queryByRole('button', { name: /Review receipt item/ })).not.toBeInTheDocument();
  expect(mocks.read).not.toHaveBeenCalled();
});
test('cancelled OCR ignores late results and failures offer manual entry', async () => {
  let finish;
  mocks.read.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const user = userEvent.setup(); render(<ReceiptImport onReview={vi.fn()} />);
  await user.click(screen.getByText('Add food from a grocery receipt', { exact: false }).closest('summary'));
  await upload(user); await user.click(screen.getByRole('button', { name: 'Read receipt' }));
  await user.click(screen.getByRole('button', { name: 'Cancel receipt reading' }));
  expect(mocks.read.mock.calls[0][1].signal.aborted).toBe(true);
  await act(async () => finish('MILK 4.50'));
  expect(screen.queryByRole('button', { name: /Review receipt item/ })).not.toBeInTheDocument();
  mocks.read.mockRejectedValueOnce(new Error('offline'));
  await user.click(screen.getByRole('button', { name: 'Read receipt' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not read this receipt');
});
test('reviewed receipt items still require manual quantity, storage and an explicit pantry save', async () => {
  const user = userEvent.setup(); render(<Pantry client={{}} userId="receipt-evaluator" />);
  await user.click((await screen.findByText('Add food from a grocery receipt', { exact: false })).closest('summary'));
  await upload(user); await user.click(screen.getByRole('button', { name: 'Read receipt' }));
  await user.click(await screen.findByRole('button', { name: 'Review receipt item 1: MILK 2L' }));
  expect(screen.getByLabelText('Food name')).toHaveValue('MILK 2L'); expect(mocks.save).not.toHaveBeenCalled();
  await user.selectOptions(screen.getByLabelText('Storage location'), 'Fridge');
  await user.type(screen.getByLabelText('Quantity'), '1'); await user.type(screen.getByLabelText('Unit'), 'bottle');
  await user.click(screen.getByRole('button', { name: 'Add food item', exact: true }));
  await screen.findByText('Food item added.');
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'MILK 2L', quantity: '1', unit: 'bottle', location: 'Fridge', notes: '', food_date: '' }), null);
});
