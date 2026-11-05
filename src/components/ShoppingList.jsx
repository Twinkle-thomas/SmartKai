import { useEffect, useMemo, useRef, useState } from 'react';
import ShoppingIngredientSearch from './ShoppingIngredientSearch.jsx';
import PantryStockCards from './PantryStockCards.jsx';
import IngredientArt from './IngredientArt.jsx';
import {INGREDIENTS} from '../data/ingredients.js';
import PurchaseTransfer from './PurchaseTransfer.jsx';
import {CATEGORIES} from '../domain/pantry.js';
import { matchingPantryItems, validateShoppingItem } from '../domain/shopping.js';
import { createShoppingService } from '../services/shopping.js';
import { createPantryService } from '../services/pantry.js';

const blank = () => ({ name: '', quantity: '1', unit: 'items', notes: '', purchased: false });
export default function ShoppingList({ client, userId }) {
  const service = useMemo(() => createShoppingService(client, userId), [client, userId]);
  const pantry = useMemo(() => createPantryService(client, userId), [client, userId]);
  const [items, setItems] = useState([]);
  const [stock, setStock] = useState([]);
  const [state, setState] = useState('loading');
  const [stockState, setStockState] = useState('loading');
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [category,setCategory]=useState('All categories');
  const [filter, setFilter] = useState('To buy');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const active = useRef(false);
  const version = useRef(0);
  const stockVersion = useRef(0);
  const lock = useRef(false);
  const nameInput = useRef(null);
  async function load() {
    const request = ++version.current;
    setState('loading');
    try {
      const records = await service.list();
      if (active.current && request === version.current) { setItems(records); setState('ready'); }
    } catch { if (active.current && request === version.current) setState('error'); }
  }
  async function loadStock() {
    const request = ++stockVersion.current;
    setStockState('loading');
    try {
      const records = await pantry.list();
      if (active.current && request === stockVersion.current) { setStock(records); setStockState('ready'); }
    } catch { if (active.current && request === stockVersion.current) setStockState('error'); }
  }
  useEffect(() => {
    active.current = true;
    if (userId) { load(); loadStock(); }
    return () => { active.current = false; version.current++; stockVersion.current++; };
  }, [service, pantry, userId]);
  async function mutate(operation, success, clearForm = false) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await operation();
      if (active.current) {
        setMessage(success); setDeleting(null);
        if (clearForm) { setForm(blank()); setEditing(null); }
        await load();
      }
    } catch { if (active.current) setError('The change could not be confirmed. Refresh your list before retrying.'); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  function submit(event) {
    event.preventDefault();
    try { validateShoppingItem(form); } catch (failure) { setError(failure.message); return; }
    mutate(() => service.save(form, editing), editing ? 'Shopping item updated.' : 'Shopping item added.', true);
  }
  const change = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  function edit(item) { setEditing(item.id); setForm(item); setError(''); setMessage(''); nameInput.current?.focus(); }
  function toggle(item) {
    mutate(async () => {
      await service.setPurchased(item.id, !item.purchased);
      if (active.current && editing === item.id) setForm((previous) => ({ ...previous, purchased: !item.purchased }));
    }, item.purchased ? 'Item moved back to your shopping list.' : 'Item marked purchased.');
  }
  const matches = stockState === 'ready' ? matchingPantryItems(form.name, stock) : [];
  const shown = items.filter(item=>category==='All categories'||(item.category??'Other')===category).sort((a,b)=>(a.category??'Other').localeCompare(b.category??'Other')).filter((item) => filter === 'All items' || (filter === 'Purchased' ? item.purchased : !item.purchased));
  const stockShown = stock.filter(({ name }) => name.toLocaleLowerCase('en-NZ').includes(search.trim().toLocaleLowerCase('en-NZ')));
  return <>
    <div className="workspace-intro"><p className="eyebrow">Your household / Shopping</p><h1>A list with intention.<br /><span>Start with what you have.</span></h1><p>Check your pantry, choose quantities and tick off your shopping as you go.</p></div>
    {!userId ? <section className="panel"><h2>Keep your shopping list handy</h2><p className="mt-3">Sign in to save and manage your list.</p><a href="#/login" className="primary mt-4">Sign in to manage shopping</a></section> : <>
      <div className="food-workspace"><section className="panel"><h2 className="text-2xl font-semibold">{editing ? 'Edit shopping item' : 'Add shopping item'}</h2>
        <form className="food-form mt-4" onSubmit={submit}><fieldset disabled={busy} className="food-form"><legend className="sr-only">Shopping item details</legend>
          <ShoppingIngredientSearch value={form.name} onChange={value=>change('name',value)} inputRef={nameInput} stock={stockState==='ready'?stock:[]} shopping={items} onChoose={item=>{setForm(previous=>({...previous,name:item.name,category:item.category,unit:item.unit}));setError('');}}/>
          {!!matches.length && <div className="rounded-xl bg-emerald-50 p-3 text-sm" role="status"><p className="font-semibold">Already recorded in your pantry</p><ul>{matches.map((item) => <li key={item.id}>{item.name}: {item.quantity} {item.unit} · {item.location}</li>)}</ul><p className="mt-2">Check what is still available before deciding how much to buy.</p></div>}
          <div className="food-form-pair"><label>Shopping quantity<input type="number" required min="0.001" max="100000" step="0.001" value={form.quantity} onChange={(e) => change('quantity', e.target.value)} /></label><label>Shopping unit<input required maxLength={30} value={form.unit} onChange={(e) => change('unit', e.target.value)} /></label></div>
          <label>Shopping category<select value={form.category??'Other'} onChange={e=>change('category',e.target.value)}>{CATEGORIES.map(v=><option key={v}>{v}</option>)}</select></label><label>Optional total item cost (NZD)<input type="number" min="0" max="100000" step="0.01" value={form.cost_nzd??''} onChange={e=>change('cost_nzd',e.target.value)}/></label><label>Shopping notes<textarea rows={3} maxLength={500} value={form.notes} onChange={(e) => change('notes', e.target.value)} /></label>
          <label className="food-checkbox"><input type="checkbox" checked={form.purchased} onChange={(e) => change('purchased', e.target.checked)} />Already purchased</label>
          <div className="flex flex-wrap gap-3"><button className="primary" type="submit">{busy ? 'Saving…' : editing ? 'Update shopping item' : 'Add shopping item'}</button>{editing && <button className="secondary" type="button" onClick={() => { setForm(blank()); setEditing(null); }}>Cancel editing shopping item</button>}</div>
        </fieldset></form><p className="mt-3" role="status">{message}</p>{error && <p className="mt-3 text-red-800" role="alert">{error}</p>}
      </section>
      <section className="panel"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">Your shopping list</h2><button className="secondary" disabled={busy || state === 'loading'} onClick={load}>Refresh shopping list</button></div>
        <label className="food-filter">Shopping category filter<select value={category} onChange={e=>setCategory(e.target.value)}>{['All categories',...CATEGORIES].map(v=><option key={v}>{v}</option>)}</select></label><label className="food-filter">Show shopping items<select value={filter} onChange={(e) => setFilter(e.target.value)}>{['To buy','Purchased','All items'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <p className="mt-3 text-sm">Purchasing an item does not change your pantry automatically. Use Add purchased item to pantry to confirm the quantities and dates you brought home.</p>
        {state === 'loading' && <p role="status" className="mt-4">Loading shopping list…</p>}
        {state === 'error' && <p role="alert" className="mt-4">Could not load your shopping list. Check your connection and refresh.</p>}
        {state === 'ready' && <><p className="mt-4 text-sm">{items.filter(({ purchased }) => !purchased).length} to buy · {items.filter(({ purchased }) => purchased).length} purchased · up to 500 saved items displayed</p>{!shown.length && <p className="mt-4">No shopping items in this view yet.</p>}<ul className="food-item-list">{shown.map((item) => <li key={item.id}>
          <label className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-emerald-800" checked={item.purchased} disabled={busy} onChange={() => toggle(item)} aria-label={`Purchased ${item.name}`} /><span className="shopping-list-art" aria-hidden="true"><IngredientArt kind={INGREDIENTS.find(entry=>entry.name.toLowerCase()===item.name.toLowerCase())?.art??'pack'}/></span><strong>{item.name}</strong><span>{item.quantity} {item.unit}</span></label>
          <p className="mt-2 text-sm">{item.category??'Other'}{item.cost_nzd!=null?` · NZ${Number(item.cost_nzd).toFixed(2)}`:''}</p>{stockState==='ready'&&matchingPantryItems(item.name,stock).length>0&&<p className="mt-2 text-sm">Potential duplicate: already recorded in pantry.</p>}{item.purchased&&<PurchaseTransfer item={item} client={client} userId={userId} onSaved={async()=>{await load();await loadStock();}}/>}{item.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{item.notes}</p>}
          <div className="mt-3 flex flex-wrap gap-3"><button className="secondary" disabled={busy} onClick={() => edit(item)} aria-label={`Edit shopping ${item.name}`}>Edit</button><button className="secondary" disabled={busy} onClick={() => setDeleting(item.id)} aria-label={`Delete shopping ${item.name}`}>Delete</button></div>
          {deleting === item.id && <div className="mt-3"><p>Delete {item.name} from your shopping list?</p><button className="secondary mt-2" disabled={busy} onClick={() => mutate(() => service.remove(item.id), 'Shopping item deleted.', editing === item.id)}>Confirm shopping deletion</button> <button className="secondary" disabled={busy} onClick={() => setDeleting(null)}>Keep shopping item</button></div>}
        </li>)}</ul></>}
      </section></div>
      <section className="panel stock-check-panel mb-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow mb-2">A quick look at what’s at home</p><h2 className="text-2xl font-semibold">Check before you shop</h2></div><button className="secondary" disabled={stockState === 'loading'} onClick={loadStock}>Refresh pantry view</button></div><p className="mt-3 text-sm">See your recorded food, quantities and storage locations before adding more to your list.</p>
        <label className="food-filter stock-check-search">Search pantry before shopping<input placeholder="Find food in your pantry…" type="search" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        {stockState === 'loading' && <p role="status" className="mt-3">Loading pantry for shopping…</p>}
        {stockState === 'error' && <p role="alert" className="mt-3">Could not load pantry. This does not mean an item is out of stock. Refresh or check your pantry directly.</p>}
        {stockState === 'ready' && <><p className="stock-check-count">{stockShown.length} {stockShown.length===1?'entry':'entries'} {search.trim()?'matching your search':'recorded in your pantry'} · up to 500 displayed</p>{!stockShown.length ? <p className="mt-3">No matching pantry records in this view.</p> : <PantryStockCards items={stockShown}/>}</>}
        <details className="stock-check-about"><summary>About pantry checks</summary><p>These records may need updating. Name matches are exact apart from spaces and capital letters; different spellings, plurals and brands may not match. Quantities are not converted or subtracted, and a record does not establish food safety.</p></details>
        <a className="text-link mt-4" href="#/pantry">Update pantry inventory ↗</a>
      </section>
    </>}
  </>;
}
