import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { LOCATIONS, DATE_TYPES, CATEGORIES, LEFTOVER_STATES, validateFood, visibleFood } from '../domain/pantry.js';
import { createPantryService } from '../services/pantry.js';
import { foodDateStatus, isActiveFood } from '../domain/foodDates.js';
import {storageFoodId} from '../data/foodStorage.js';
import InventoryHistory from './InventoryHistory.jsx';
import InventoryOutcome from './InventoryOutcome.jsx';
import ExpiryCalendar from './ExpiryCalendar.jsx';
import IngredientArt from './IngredientArt.jsx';
import {INGREDIENTS} from '../data/ingredients.js';
import FoodDateBadge from './FoodDateBadge.jsx';
const FoodPhotoImport = lazy(() => import('./FoodPhotoImport.jsx'));
const ReceiptImport = lazy(() => import('./ReceiptImport.jsx'));
const BarcodeImport = lazy(() => import('./BarcodeImport.jsx'));
const IngredientPicker = lazy(() => import('./IngredientPicker.jsx'));

const blank = (leftover = false) => ({ name: '', quantity: '1', unit: 'items', location: leftover ? 'Fridge' : 'Pantry', date_type: 'Not recorded', food_date: '', use_first: false, is_leftover: leftover, notes: '', category: leftover ? 'Prepared meals' : 'Other', planned_use_date: '', leftover_status: 'Available' });

export default function Pantry({ client, userId, initialFilter = 'All items', view = 'pantry' }) {
  const service = useMemo(() => createPantryService(client, userId), [client, userId]);
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading');
  const [filter, setFilter] = useState(initialFilter);
  const [form, setForm] = useState(() => blank(view === 'leftovers'));
  const [category, setCategory] = useState('All categories');
  const [dateFilter, setDateFilter] = useState('All dates');
  const [search,setSearch]=useState('');
  const [sort,setSort]=useState('Use first');
  const [calendar,setCalendar]=useState(false);
  const [horizon, setHorizon] = useState(3);
  const [now, setNow] = useState(() => new Date());
  const [pickerOpen,setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const active = useRef(false);
  const request = useRef(0);
  const lock = useRef(false);
  const nameInput = useRef(null);
  const pickerTrigger = useRef(null);
  const pickerVisited = useRef(false);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);
  useEffect(()=>{if(pickerOpen)pickerVisited.current=true;else if(pickerVisited.current)pickerTrigger.current?.focus();},[pickerOpen]);
  useEffect(() => { const tick = () => setNow(new Date()); const timer = window.setInterval(tick,60000); window.addEventListener('focus',tick); return () => { window.clearInterval(timer); window.removeEventListener('focus',tick); }; }, []);
  async function load() {
    const version = ++request.current;
    setState('loading');
    try {
      const data = await service.list({ includeArchived: true });
      if (active.current && version === request.current) { setItems(data); setState('ready'); }
    } catch { if (active.current && version === request.current) setState('error'); }
  }
  useEffect(() => {
    active.current = true;
    if (userId) load();
    return () => { active.current = false; request.current++; };
  }, [service, userId]);
  const change = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  async function mutate(operation, success) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await operation();
      if (active.current) {
        setMessage(success); setForm(blank(view === 'leftovers')); setEditing(null); setDeleting(null);
        await load();
      }
    } catch (failure) {
      if (active.current) setError(failure.validation ? failure.message : 'The change could not be confirmed. Refresh your pantry before retrying.');
    } finally { lock.current = false; if (active.current) setBusy(false); }
  }
  function submit(event) {
    event.preventDefault();
    try { validateFood(form); } catch (failure) { setError(failure.message); return; }
    mutate(() => service.save(form, editing), editing ? 'Food item updated.' : 'Food item added.');
  }
  function edit(item) {
    setEditing(item.id); setForm({ ...item, food_date: item.food_date ?? '' }); setError(''); setMessage('');
    nameInput.current?.focus();
  }
  function reviewImport(suggestion) {
    if (lock.current) return;
    setForm(suggestion); setEditing(null); setError(''); setMessage('Review the suggested name, storage location, quantity and unit before adding this food.');
    nameInput.current?.focus();
  }
  const base = filter === 'Inventory history' ? items.filter(item=>!isActiveFood(item)) : filter === 'Leftover history' ? items.filter((item) => item.is_leftover && !isActiveFood(item)) : visibleFood(items, filter);
  const shown = base.filter(item=>item.name.toLocaleLowerCase('en-NZ').includes(search.trim().toLocaleLowerCase('en-NZ'))).filter((item) => category === 'All categories' || (item.category ?? 'Other') === category).filter((item) => {
    const key = foodDateStatus(item, now, horizon).key;
    return dateFilter === 'All dates' || (dateFilter === 'Due soon' ? ['soon','today'].includes(key) : dateFilter === 'Today' ? key === 'today' : dateFilter === 'Date passed' ? key === 'passed' : key === 'undated');
  });
  if (view === 'expiry') shown.sort((a,b) => (foodDateStatus(a,now,horizon).days ?? Infinity) - (foodDateStatus(b,now,horizon).days ?? Infinity));
  if(sort==='Name')shown.sort((a,b)=>a.name.localeCompare(b.name));
  if(sort==='Quantity')shown.sort((a,b)=>Number(b.quantity)-Number(a.quantity));
  function outcome(item, status) { mutate(() => service.save({ ...item, leftover_status: status, location: status === 'Frozen' ? 'Freezer' : item.location }, item.id), `Leftover marked ${status.toLowerCase()}.`); }
  async function saveIngredients(selected) {
    await service.saveMany(selected);
    if(!active.current)return;
    setPickerOpen(false);setForm(blank());setEditing(null);setFilter('All items');setCategory('All categories');setDateFilter('All dates');setError('');setMessage(`${selected.length} ingredients added to your pantry.`);
    await load();
  }
  if(pickerOpen&&userId)return <Suspense fallback={<p role="status">Opening ingredient list…</p>}><IngredientPicker existingItems={items} initialLocation={LOCATIONS.includes(filter)?filter:'Fridge'} onClose={()=>setPickerOpen(false)} onSave={saveIngredients}/></Suspense>;
  return <>
    <div className="workspace-intro"><p className="eyebrow">Your household / {view === 'barcode' ? 'Barcodes' : view === 'expiry' ? 'Food dates' : view === 'leftovers' ? 'Leftovers' : 'Pantry'}</p><h1>{view === 'barcode' ? <>Scan. Check. Review.<br/><span>A simpler product lookup.</span></> : view === 'expiry' ? <>A date to remember.<br /><span>A clearer view of food.</span></> : view === 'leftovers' ? <>Another meal.<br /><span>A plan for what’s left.</span></> : <>Good food.<br /><span>In plain sight.</span></>}</h1><p>{view === 'expiry' ? 'Review recorded dates. Highlighting a date does not determine whether food is safe.' : view === 'leftovers' ? 'Record leftovers, choose a planned-use date and keep a history of whole-entry outcomes.' : 'See what you have, record food dates and make space for what you want to use first.'}</p><div className="mt-4 flex flex-wrap gap-4">{view === 'pantry' && userId && <button ref={pickerTrigger} className="primary" disabled={busy} onClick={()=>setPickerOpen(true)}>＋ Add ingredients</button>}<a className="text-link" href="#/expiry">Food-date tracker ↗</a><a className="text-link" href="#/leftovers">Leftover manager ↗</a><a className="text-link" href="#/storage">Storage guide ↗</a>{view === 'leftovers' && <a className="text-link" href="#/meals">Plan how to use leftovers ↗</a>}</div></div>
    {!userId ? <section className="panel"><h2>Keep your pantry in one place</h2><p>Sign in to add and save food items.</p><a className="primary mt-4" href="#/login">Sign in to manage pantry</a></section> : <><Suspense fallback={null}>{view === 'pantry' && <><ReceiptImport disabled={busy} onReview={reviewImport} /><FoodPhotoImport disabled={busy} onReview={reviewImport} /><BarcodeImport disabled={busy} onReview={reviewImport} /></>}{view === 'barcode' && <BarcodeImport disabled={busy} onReview={reviewImport} />}</Suspense>{['pantry','leftovers'].includes(view)&&<InventoryHistory client={client} userId={userId}/>} {view==='leftovers'&&<section className="panel mb-6"><h2 className="text-2xl font-semibold">Give suitable leftovers a plan</h2><p className="mt-3">Consider using suitable cooked vegetables in a soup or frittata, or planning a leftover lunch. Check the original preparation date, storage history and packaging first. These ideas do not establish food safety.</p><a className="text-link mt-3" href="#/storage?topic=Leftovers">Read New Zealand leftover storage guidance ↗</a><a className="secondary mt-3" href="#/meals">Plan a leftover meal</a></section>}{view==='expiry'&&<><button className="secondary mb-4" onClick={()=>setCalendar(!calendar)}>{calendar?'Hide calendar':'Show calendar'}</button>{calendar&&<ExpiryCalendar items={items} onEdit={edit}/>}</>}<div className="food-workspace">
      <section className="panel"><h2 className="text-2xl font-semibold">{editing ? 'Edit food item' : 'Add food item'}</h2>
        <form className="food-form mt-4" onSubmit={submit}>
          <fieldset disabled={busy} className="food-form"><legend className="sr-only">Food details</legend>
            <label>Food name<input ref={nameInput} required maxLength={100} value={form.name} onChange={(e) => change('name', e.target.value)} /></label>
            <div className="food-form-pair"><label>Quantity<input type="number" min="0.001" max="100000" step="0.001" required value={form.quantity} onChange={(e) => change('quantity', e.target.value)} /></label><label>Unit<input required maxLength={30} value={form.unit} onChange={(e) => change('unit', e.target.value)} /></label></div>
            <label>Storage location<select value={form.location} onChange={(e) => change('location', e.target.value)}>{LOCATIONS.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Food category<select value={form.category ?? 'Other'} onChange={(e) => change('category',e.target.value)}>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Food-date type<select value={form.date_type} onChange={(e) => setForm((previous) => ({ ...previous, date_type: e.target.value, food_date: e.target.value === 'Not recorded' ? '' : previous.food_date }))}>{DATE_TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
            {form.date_type !== 'Not recorded' && <label>Food date<input type="date" required value={form.food_date} onChange={(e) => change('food_date', e.target.value)} /></label>}
            <label>Purchase date<input type="date" value={form.purchase_date??''} onChange={e=>change('purchase_date',e.target.value)}/></label><label className="food-checkbox"><input type="checkbox" checked={form.use_first} onChange={(e) => change('use_first', e.target.checked)} />Use first</label>
            <label className="food-checkbox"><input type="checkbox" checked={form.is_leftover} onChange={(e) => setForm((previous) => ({ ...previous, is_leftover: e.target.checked, planned_use_date: e.target.checked ? previous.planned_use_date : '', leftover_status: e.target.checked ? previous.leftover_status : 'Available' }))} />This is a leftover</label>
            {form.is_leftover && <><label>Preparation date<input type="date" value={form.prepared_date??''} onChange={e=>change('prepared_date',e.target.value)}/></label><label>Stored date<input type="date" value={form.stored_date??''} onChange={e=>change('stored_date',e.target.value)}/></label><label>Planned use date<input type="date" value={form.planned_use_date ?? ''} onChange={(e) => change('planned_use_date',e.target.value)} /></label><p className="text-xs">Your plan is not an expiry or safety deadline.</p><label>Leftover status<select value={form.leftover_status ?? 'Available'} onChange={(e) => setForm((previous) => ({ ...previous, leftover_status: e.target.value, location: e.target.value === 'Frozen' ? 'Freezer' : previous.location }))}>{LEFTOVER_STATES.map((value) => <option key={value} disabled={["Used","Discarded"].includes(value)}>{value}</option>)}</select></label></>}
            <label>Storage instructions or planned use<textarea maxLength={500} rows={3} value={form.notes} onChange={(e) => change('notes', e.target.value)} /></label>
            <div className="flex flex-wrap gap-3"><button className="primary" type="submit">{busy ? 'Saving…' : editing ? 'Update food item' : 'Add food item'}</button>{editing && <button className="secondary" type="button" onClick={() => { setForm(blank(view === 'leftovers')); setEditing(null); }}>Cancel editing</button>}</div>
          </fieldset>
        </form>
        <p role="status" className="mt-3">{message}</p>{error && <p role="alert" className="mt-3 text-red-800">{error}</p>}
      </section>
      <section className="panel" aria-labelledby="pantry-list-title"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="pantry-list-title" className="text-2xl font-semibold">Your food</h2><button className="secondary" disabled={busy || state === 'loading'} onClick={load}>Refresh pantry</button></div>
        <div className="food-form-pair food-form mt-3"><label>Search saved food<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Sort saved food<select value={sort} onChange={e=>setSort(e.target.value)}>{['Use first','Name','Quantity'].map(value=><option key={value}>{value}</option>)}</select></label></div><label className="food-filter">Show food<select value={filter} onChange={(e) => setFilter(e.target.value)}>{['All items', 'Use first', 'Leftovers', 'Leftover history', 'Inventory history', ...LOCATIONS].map((value) => <option key={value}>{value}</option>)}</select></label>
        <div className="food-form-pair mt-3"><label className="food-filter">Filter category<select value={category} onChange={(e) => setCategory(e.target.value)}>{['All categories',...CATEGORIES].map((value) => <option key={value}>{value}</option>)}</select></label><label className="food-filter">Filter dates<select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>{['All dates','Due soon','Today','Date passed','No expiry date'].map((value) => <option key={value}>{value}</option>)}</select></label></div>
        <label className="food-filter">Look ahead<select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>{[1,3,7,14].map((value) => <option key={value} value={value}>{value} days</option>)}</select></label>
        <p className="mt-3 text-sm">Use dates and storage instructions on the packaging. Dates and the “use first” flag here do not establish whether food is safe to eat.</p>
        {state === 'loading' && <p role="status" className="mt-4">Loading pantry…</p>}
        {state === 'error' && <p role="alert" className="mt-4">Could not load pantry. Check your connection and refresh.</p>}
        {state === 'ready' && <><p className="mt-3 text-xs">{items.length} saved items (up to 500 displayed). Consumed/discarded entries are kept in Inventory history.</p>{!shown.length && <p className="mt-4">No food items in this view yet.</p>}<ul className="food-item-list">{shown.map((item) => <li key={item.id}>
          <span className="ingredient-thumbnail"><IngredientArt kind={INGREDIENTS.find(entry=>entry.name.toLowerCase()===item.name.toLowerCase())?.art??'pack'}/></span><div className="flex flex-wrap justify-between gap-3"><h3 className="text-lg font-semibold">{item.name}</h3><span>{item.quantity} {item.unit}</span></div><p className="mt-2">{item.location}{item.use_first ? ' · Use first' : ''}{item.is_leftover ? ' · Leftover' : ''}</p>
          <p className="mt-1 text-sm">{item.food_date ? `${item.date_type}: ${item.food_date}` : 'No food date recorded'} · {item.category ?? 'Other'}</p><FoodDateBadge item={item} now={now} horizon={horizon} />{isActiveFood(item)&&['soon','today'].includes(foodDateStatus(item,now,horizon).key)&&<p className="mt-2 text-sm">Review storage and packaging, then <a className="underline" href="#/meals">plan suitable food into a meal</a>. Freeze only if the label and handling history allow it, before a use-by date passes.</p>}{item.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{item.notes}</p>}
          {item.purchase_date&&<p className="mt-2 text-sm">Purchased: {item.purchase_date}</p>}{item.prepared_date&&<p className="text-sm">Prepared: {item.prepared_date} · Stored: {item.stored_date??'Not recorded'}</p>}{item.disposal_reason&&<p className="text-sm">Disposal reason: {item.disposal_reason}</p>}<a className="text-link mt-2" href={storageFoodId(item.name)?`#/storage?food=${storageFoodId(item.name)}`:`#/storage?topic=${encodeURIComponent(item.is_leftover?'Leftovers':LOCATIONS.includes(item.location)?item.location:'All topics')}`}>Storage guidance for this food ↗</a>{isActiveFood(item)&&<InventoryOutcome item={item} client={client} userId={userId} onSaved={load}/>}
          {item.is_leftover && <><p className="mt-2 text-sm">Status: {item.leftover_status ?? 'Available'}{item.planned_use_date ? ` · Planned use: ${item.planned_use_date}` : ''}</p><div className="mt-3 flex flex-wrap gap-2">{isActiveFood(item) && <><button className="secondary" disabled={busy || (item.date_type === 'Use by' && foodDateStatus(item,now).key === 'passed')} onClick={() => outcome(item,'Frozen')}>Record as frozen</button></>}<a className="text-link" href="#/meals">Plan a leftover meal ↗</a></div></>}
          <div className="mt-3 flex flex-wrap gap-3"><button className="secondary" disabled={busy} onClick={() => edit(item)} aria-label={`Edit ${item.name}`}>Edit</button><button className="secondary" disabled={busy} onClick={() => setDeleting(item.id)} aria-label={`Delete ${item.name}`}>Delete</button></div>
          {deleting === item.id && <div className="mt-3" role="group" aria-label={`Confirm deletion of ${item.name}`}><p>Delete {item.name} from your pantry?</p><button className="secondary mt-2" disabled={busy} onClick={() => mutate(() => service.remove(item.id), 'Food item deleted.')}>Confirm delete</button> <button className="secondary" disabled={busy} onClick={() => setDeleting(null)}>Keep item</button></div>}
        </li>)}</ul></>}
      </section>
    </div></>}
  </>;
}
