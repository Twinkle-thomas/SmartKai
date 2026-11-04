// Conservative line-item suggestions, not a retailer-specific receipt parser.
const METADATA = /^(?:sub[ -]?total|total|gst|tax|eftpos|visa|mastercard|debit|credit|cash|change|amount|balance|savings?|discount|coupon|promo|receipt|invoice|store|address|phone|tel|date|time|served|cashier|operator|terminal|auth|approval|card|account|customer|loyalty|member|thank|transaction|payment|items?\b)/i;
export const RECEIPT_TEXT_LIMIT = 20000;

export function receiptItems(text) {
  const lines = String(text).slice(0, RECEIPT_TEXT_LIMIT).split(/\r?\n/).slice(0, 300);
  const items = [];
  for (const [index, raw] of lines.entries()) {
    const line = raw.trim().replace(/\s+/g, ' ');
    if (!line || METADATA.test(line) || /[*#]{2,}/.test(line)) continue;
    // Require a trailing decimal price; never turn that price into a quantity.
    const priced = line.match(/^(.+?)\s+\$?\s*(-?\d{1,6}[.,]\d{2})\s*(?:[A-Z])?$/i);
    if (!priced || priced[2].startsWith('-')) continue;
    const name = priced[1].replace(/^\d{4,14}\s+/, '').replace(/^\d+\s*[x×]\s+/i, '').trim();
    if (METADATA.test(name) || !/[a-z]{2}/i.test(name) || /^[\d.,\s]+(?:kg|g|l|ml)\b/i.test(name) || /\s[@]\s/.test(name)) continue;
    items.push({ key: `receipt-${index}`, name: name.slice(0, 100), line: line.slice(0, 180) });
    if (items.length === 100) break;
  }
  return items;
}
