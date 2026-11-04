import { normalizeBarcode } from '../domain/barcodes.js';
const cache = new Map();
const calls = [];
export async function decodeBarcode(image) {
  const { BrowserMultiFormatOneDReader } = await import('@zxing/browser');
  const result = await new BrowserMultiFormatOneDReader().decodeFromImageElement(image);
  return normalizeBarcode(result.getText());
}
export async function lookupBarcode(value, { signal, fetcher = fetch } = {}) {
  const code = normalizeBarcode(value);
  const now = Date.now();
  const cached = cache.get(code);
  if (cached && now-cached.time < 300000) return cached.product;
  while (calls.length && calls[0] <= now-60000) calls.shift();
  if (calls.length >= 5) throw new Error('Please wait a minute before another product lookup. You can still add food manually.');
  calls.push(now);
  const response = await fetcher(`https://world.openfoodfacts.org/api/v3.6/product/${code}.json?fields=product_name,brands,quantity&app_name=SmartKai&app_version=0.1.0`, { signal, credentials:'omit', headers:{ 'User-Agent':'SmartKai/0.1.0 (https://github.com/Twinkle-thomas/SmartKai)' } });
  if (response.status===404) return null;
  if (!response.ok) throw new Error(response.status===429 ? 'Product lookup is temporarily rate limited. Try later or add food manually.' : 'Product lookup is unavailable. Try later or add food manually.');
  const data = await response.json();
  const item = data.product;
  const product = item && typeof item.product_name==='string' && item.product_name.trim() ? { code, name:item.product_name.trim().slice(0,100), brand:typeof item.brands==='string'?item.brands.slice(0,100):'', pack:typeof item.quantity==='string'?item.quantity.slice(0,100):'' } : null;
  if (cache.size >= 50) cache.delete(cache.keys().next().value);
  cache.set(code,{time:now,product});
  return product;
}
