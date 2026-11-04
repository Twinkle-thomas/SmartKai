import { beforeEach, expect, test, vi } from 'vitest';
import { receiptItems } from '../src/domain/receipt.js';
import { readReceipt } from '../src/services/receiptOcr.js';

const mocks = vi.hoisted(() => ({ create: vi.fn(), recognize: vi.fn(), terminate: vi.fn(), parameters: vi.fn() }));
vi.mock('tesseract.js', () => ({ createWorker: mocks.create }));
const worker = () => ({ recognize: mocks.recognize, terminate: mocks.terminate, setParameters: mocks.parameters });
beforeEach(() => {
  vi.restoreAllMocks(); vi.resetAllMocks();
  mocks.create.mockImplementation(async () => worker()); mocks.parameters.mockResolvedValue(undefined); mocks.terminate.mockResolvedValue(undefined);
  mocks.recognize.mockResolvedValue({ data: { text: 'MILK 2L 4.50\nTOTAL 4.50' } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn(), fillRect: vi.fn() });
});
test('receipt parser keeps possible item descriptions but excludes common totals/payment/discount lines', () => {
  const text = 'SMARTKAI GROCER\n123456 MILK 2L 4.50\n2 x APPLES 3.99\nHAND SOAP 2.00\nSUBTOTAL 10.49\nGST 1.37\nTOTAL 10.49\nVISA ****1234 10.49\nDISCOUNT -1.00\n0.500 kg @ 3.99/kg 2.00';
  const results = receiptItems(text);
  expect(results.map(({ name }) => name)).toEqual(['MILK 2L','APPLES','HAND SOAP']);
  expect(results[0]).not.toHaveProperty('quantity'); expect(results[0]).not.toHaveProperty('food_date');
  expect(receiptItems('No item prices\nTOTAL 2.00')).toEqual([]);
  expect(receiptItems(Array.from({ length: 200 }, (_, i) => `GROCERY ${i} 2.00`).join('\n'))).toHaveLength(100);
});
test('OCR runs in a worker, returns only extracted text and terminates after success or error', async () => {
  const image = { naturalWidth: 1000, naturalHeight: 2000 };
  expect(await readReceipt(image)).toContain('MILK');
  expect(mocks.create).toHaveBeenCalledWith('eng', 1, expect.objectContaining({ cacheMethod: 'none' }));
  expect(mocks.recognize).toHaveBeenCalledWith(expect.any(HTMLCanvasElement));
  expect(mocks.terminate).toHaveBeenCalled();
  mocks.recognize.mockRejectedValueOnce(new Error('OCR failed'));
  await expect(readReceipt(image)).rejects.toThrow('OCR failed');
  expect(mocks.terminate).toHaveBeenCalledTimes(2);
});
test('pre-aborted OCR does not start a worker', async () => {
  const controller = new AbortController(); controller.abort();
  await expect(readReceipt({}, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  expect(mocks.create).not.toHaveBeenCalled();
});
test('cancelling OCR settles even when the worker recognition promise never returns', async () => {
  let started;
  const reading = new Promise((resolve) => { started = resolve; });
  mocks.recognize.mockImplementation(() => { started(); return new Promise(() => {}); });
  const controller = new AbortController(); const promise = readReceipt({ naturalWidth: 1000, naturalHeight: 2000 }, { signal: controller.signal });
  await reading; controller.abort();
  await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  expect(mocks.terminate).toHaveBeenCalled();
});
