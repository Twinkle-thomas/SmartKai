// Actual OCR on a synthetic receipt generated entirely in memory.
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { receiptItems } from '../src/domain/receipt.js';

const lines = ['SMARTKAI GROCER', 'DEMO RECEIPT', 'MILK 2L    4.50', 'APPLES     3.99', 'BREAD      2.80', 'TOTAL     11.29'];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="800"><rect width="1000" height="800" fill="white"/><g font-family="Arial" font-size="58" fill="black">${lines.map((line, i) => `<text x="70" y="${110 + i * 110}" xml:space="preserve">${line}</text>`).join('')}</g></svg>`;
const png = await sharp(Buffer.from(svg)).png().toBuffer();
const worker = await createWorker('eng', 1, { cacheMethod: 'none', errorHandler: () => {} });
try {
  const { data } = await worker.recognize(png);
  const items = receiptItems(data.text);
  assert(items.some(({ name }) => /milk/i.test(name)), 'Synthetic milk line was not extracted');
  assert(items.some(({ name }) => /apples/i.test(name)), 'Synthetic apple line was not extracted');
  assert(!items.some(({ name }) => /total/i.test(name)), 'A total must not become an inventory item');
  console.log(JSON.stringify({ engine: 'Tesseract.js English OCR', syntheticReceiptItems: items.map(({ name }) => name), note: 'Synthetic smoke check, not a retailer receipt-accuracy evaluation.' }, null, 2));
} finally { await worker.terminate(); }
