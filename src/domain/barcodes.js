export function normalizeBarcode(value) {
  const code = String(value).replace(/[\s-]/g,'');
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) throw new Error('Enter an 8, 12, 13 or 14 digit product barcode.');
  let sum=0;
  for (let i=code.length-2, weight=3;i>=0;i--,weight=weight===3?1:3) sum += Number(code[i])*weight;
  if ((10-sum%10)%10 !== Number(code.at(-1))) throw new Error('The barcode check digit is invalid. Check the number or scan again.');
  return code;
}
