import { useEffect, useRef, useState } from 'react';
import { FOOD_CLASSES, validateFoodPhoto } from '../domain/foodRecognition.js';
import { LOCATIONS } from '../domain/pantry.js';
import { recognizeFood } from '../services/foodRecognition.js';

export default function FoodPhotoImport({ onReview, disabled = false }) {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [ready, setReady] = useState(false);
  const [location, setLocation] = useState('Fridge');
  const [suggestions, setSuggestions] = useState([]);
  const [stage, setStage] = useState('idle');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const image = useRef(null);
  const version = useRef(0);
  const lock = useRef(false);
  const alive = useRef(true);
  const busy = stage === 'loading' || stage === 'analysing';
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; version.current++; };
  }, []);
  useEffect(() => {
    if (!file) { setUrl(''); return; }
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);
  function choose(event) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    version.current++; setSuggestions([]); setMessage(''); setReady(false); setStage('idle'); setFile(null); setError('');
    try { validateFoodPhoto(selected); setFile(selected); } catch (failure) { setError(failure.message); }
  }
  function clear() {
    version.current++; setFile(null); setReady(false); setSuggestions([]); setStage('idle'); setError(''); setMessage('');
  }
  async function analyse() {
    if (!ready || !image.current || lock.current || disabled) return;
    const request = ++version.current;
    lock.current = true; setError(''); setMessage(''); setSuggestions([]); setStage('loading');
    try {
      const results = await recognizeFood(image.current, (next) => { if (alive.current && request === version.current) setStage(next); });
      if (alive.current && request === version.current) { setSuggestions(results); setStage('done'); }
    } catch {
      if (alive.current && request === version.current) { setStage('error'); setError('Could not analyse this photo. Check your internet connection for the model download, try a smaller photo, or add food manually. No suggestions have been saved.'); }
    } finally { lock.current = false; }
  }
  return <details className="panel photo-import mb-6"><summary className="cursor-pointer text-xl font-semibold">Add food from a photo <span className="feature-status ml-2">AI preview</span></summary>
    <div className="mt-4"><p>Upload a fridge, pantry or food photo, then review possible foods before adding anything.</p><p className="mt-2 text-sm">The photo stays on this device. The first analysis downloads an open-source model and needs internet access. There is no paid recognition API or API key.</p>
      <details className="mt-3 text-sm"><summary className="cursor-pointer underline">Which foods can it recognise?</summary><p className="mt-2">{Object.values(FOOD_CLASSES).join(', ')}. This limited model can miss or misidentify food, especially in crowded fridges and packaged groceries. It cannot read expiry dates, establish quantities or determine food safety.</p></details>
      <div className="photo-import-layout mt-5"><div className="food-form">
        <label>Upload a food photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || disabled} onChange={choose} /></label>
        <label>Take a food photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy || disabled} onChange={choose} /></label>
        <p className="text-xs text-stone-600">JPEG, PNG or WebP, up to 8 MB and 24 megapixels. Camera capture depends on your phone and browser.</p>
        <label>Where is this food stored?<select value={location} disabled={busy || disabled} onChange={(e) => setLocation(e.target.value)}>{LOCATIONS.map((value) => <option key={value}>{value}</option>)}</select></label>
        <div className="flex flex-wrap gap-3"><button className="primary" disabled={!ready || busy || disabled} onClick={analyse}>{busy ? 'Analysing…' : stage === 'error' ? 'Try analysis again' : 'Find possible foods'}</button>{file && <button className="secondary" disabled={busy || disabled} onClick={clear}>Remove photo</button>}</div>
      </div><div>{url && <img key={url} ref={image} src={url} alt="Your selected food photo for local analysis" className="food-photo-preview" onLoad={() => {
        if (image.current.naturalWidth * image.current.naturalHeight > 24000000) { setReady(false); setError('This photo is too large to analyse on this device. Resize it to 24 megapixels or less.'); }
        else { setReady(true); setError(''); }
      }} onError={() => { setReady(false); setSuggestions([]); setError('This image could not be opened. Choose another JPEG, PNG or WebP photo.'); }} />}</div></div>
      <p role="status" className="mt-4">{stage === 'loading' ? 'Loading the food-recognition model… This may take a moment the first time.' : stage === 'analysing' ? 'Looking for supported food types on this device…' : stage === 'done' && !suggestions.length ? 'No supported foods found. Try a clearer photo or use the manual food form below.' : stage === 'done' ? 'Possible foods found. Review each suggestion; nothing has been added to your pantry.' : ''}</p>
      {error && <p role="alert" className="mt-3 text-red-800">{error}</p>}
      {!!suggestions.length && <section className="mt-5" aria-labelledby="photo-suggestions-title"><h2 id="photo-suggestions-title" className="text-lg font-semibold">Review possible foods</h2><p className="mt-2 text-sm">Check your existing inventory first. Review one food at a time in the form below, correct the name, enter a quantity and unit, then choose Add food item. Dates remain blank.</p><ul className="photo-suggestion-list mt-4">{suggestions.map(({ key, name }) => <li key={key}><strong>{name}</strong><span className="text-xs">Possible match — may be incorrect</span><button className="secondary" disabled={disabled||busy} onClick={()=>setSuggestions(previous=>previous.filter(item=>item.key!==key))}>Reject {name}</button><button className="secondary" disabled={disabled || busy} onClick={() => {
        onReview({ name, quantity: '', unit: '', location, date_type: 'Not recorded', food_date: '', use_first: false, is_leftover: false, notes: '' });
        setMessage(`${name} is ready for your review in the food form. It has not been saved.`);
      }}>Review {name}</button></li>)}</ul></section>}
      <p role="status" className="mt-3 text-sm">{message}</p>
    </div>
  </details>;
}
