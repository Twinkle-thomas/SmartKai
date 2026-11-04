import { useEffect, useRef, useState } from 'react';
import { validateFoodPhoto } from '../domain/foodRecognition.js';
import { receiptItems, RECEIPT_TEXT_LIMIT } from '../domain/receipt.js';
import { readReceipt } from '../services/receiptOcr.js';

export default function ReceiptImport({ onReview, disabled = false }) {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [parsed, setParsed] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const image = useRef(null);
  const controller = useRef(null);
  const version = useRef(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; version.current++; controller.current?.abort(); }; }, []);
  useEffect(() => {
    if (!file) { setUrl(''); return; }
    const preview = URL.createObjectURL(file); setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);
  function cancel() { version.current++; controller.current?.abort(); controller.current = null; setBusy(false); setProgress(''); }
  function reset() { cancel(); setFile(null); setReady(false); setText(''); setSuggestions([]); setParsed(false); setError(''); setMessage(''); }
  function choose(event) {
    const selected = event.target.files?.[0]; event.target.value = '';
    if (!selected) return;
    reset();
    try { validateFoodPhoto(selected); setFile(selected); } catch (failure) { setError(failure.message); }
  }
  async function scan() {
    if (!ready || !image.current || busy || disabled) return;
    const request = ++version.current;
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError(''); setMessage(''); setSuggestions([]); setParsed(false); setText(''); setProgress('Loading the receipt reader…');
    try {
      const result = await readReceipt(image.current, { signal: abort.signal, onProgress: ({ status, progress: amount }) => {
        if (alive.current && request === version.current) setProgress(status === 'recognizing text' ? `Reading receipt text: ${Math.round(amount * 100)}%` : 'Preparing the receipt reader…');
      } });
      if (alive.current && request === version.current) {
        const bounded = result.slice(0, RECEIPT_TEXT_LIMIT);
        setText(bounded); setSuggestions(receiptItems(bounded)); setParsed(true);
        setMessage(result.length > RECEIPT_TEXT_LIMIT ? 'Receipt text was limited to 20,000 characters. Review the captured section and add missing items manually.' : 'Receipt text extracted. Review possible items before adding anything.');
      }
    } catch (failure) {
      if (alive.current && request === version.current && failure.name !== 'AbortError') setError('Could not read this receipt. Check your connection for OCR downloads, try a clearer photo, paste item text below or add food manually. Nothing has been saved.');
    } finally {
      if (alive.current && request === version.current) { setBusy(false); setProgress(''); controller.current = null; }
    }
  }
  return <details className="panel mb-6"><summary className="cursor-pointer text-xl font-semibold">Add food from a grocery receipt <span className="feature-status ml-2">OCR preview</span></summary><div className="mt-4">
    <p>Read a receipt photo, check possible grocery items, then review each item in the pantry form.</p><p className="mt-2 text-sm">Receipt photos and extracted text stay on this device. Internet access is needed to download the OCR tools; no paid OCR API is used. Only the item details you explicitly save go into your pantry.</p>
    <div className="photo-import-layout mt-5"><div className="food-form"><label>Upload a receipt photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || disabled} onChange={choose} /></label><label>Take a receipt photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy || disabled} onChange={choose} /></label><p className="text-xs text-stone-600">Use a sharp, upright photo with the whole receipt in good light. JPEG, PNG or WebP, up to 8 MB and 24 megapixels. PDFs and HEIC are not supported.</p><div className="flex flex-wrap gap-3"><button className="primary" disabled={!ready || busy || disabled} onClick={scan}>{busy ? 'Reading receipt…' : 'Read receipt'}</button>{busy && <button className="secondary" onClick={() => { cancel(); setMessage('Receipt reading cancelled. Nothing has been saved.'); }}>Cancel receipt reading</button>}{file && !busy && <button className="secondary" disabled={disabled} onClick={reset}>Clear receipt</button>}</div></div>
      <div>{url && <img key={url} ref={image} src={url} alt="Your selected receipt for local text extraction" className="food-photo-preview" onLoad={() => {
        if (image.current.naturalWidth * image.current.naturalHeight > 24000000) { setReady(false); setError('Resize this receipt photo to 24 megapixels or less.'); }
        else { setReady(true); setError(''); }
      }} onError={() => { setReady(false); setError('This receipt image could not be opened. Choose another JPEG, PNG or WebP.'); }} />}</div></div>
    <p role="status" className="mt-3">{progress || message}</p>{error && <p role="alert" className="mt-3 text-red-800">{error}</p>}
    <div className="food-form mt-5"><label>Receipt text to review or paste<textarea rows={7} maxLength={RECEIPT_TEXT_LIMIT} disabled={busy || disabled} value={text} onChange={(e) => { setText(e.target.value); setSuggestions([]); setParsed(false); setMessage(''); }} /></label><p className="text-xs text-stone-600">Correct OCR mistakes here, then find item suggestions again. Totals and common payment lines are excluded by simple rules; other non-food lines or purchases may remain. Up to 100 suggestions from the first 300 lines are shown.</p></div>
    <button className="secondary mt-3" disabled={busy || disabled || !text.trim()} onClick={() => { setSuggestions(receiptItems(text)); setParsed(true); setMessage('Item suggestions updated. Review each item before saving.'); }}>Find receipt items</button>
    {parsed && !suggestions.length && <p className="mt-4">No possible item lines found. Correct the receipt text or add items with the manual form.</p>}
    {!!suggestions.length && <section className="mt-5" aria-labelledby="receipt-items-title"><h2 id="receipt-items-title" className="text-lg font-semibold">Possible receipt items</h2><p className="mt-2 text-sm">Check names against the receipt and your existing pantry. Quantities, units, dates and storage locations are not inferred. Review one item at a time and choose Add food item only after checking its details.</p><ul className="food-item-list">{suggestions.map((item, index) => <li key={item.key}><strong>{item.name}</strong><p className="mt-2 break-words text-xs text-stone-600">Receipt line: {item.line}</p><div className="mt-3 flex flex-wrap gap-3"><button className="secondary" disabled={disabled || busy} aria-label={`Review receipt item ${index + 1}: ${item.name}`} onClick={() => {
      onReview({ name: item.name, quantity: '', unit: '', location: 'Other', date_type: 'Not recorded', food_date: '', use_first: false, is_leftover: false, notes: '' });
      setMessage(`${item.name} is ready for review in the pantry form. Choose a storage location, quantity and unit before saving.`);
    }}>Review item</button><button className="secondary" disabled={disabled || busy} aria-label={`Discard receipt item ${index + 1}: ${item.name}`} onClick={() => setSuggestions((previous) => previous.filter(({ key }) => key !== item.key))}>Discard suggestion</button></div></li>)}</ul></section>}
  </div></details>;
}
