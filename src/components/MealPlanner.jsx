import { useEffect, useMemo, useRef, useState } from 'react';
import { addIngredient, mealDateLabel, MEAL_SLOTS, todayInNZ, validMealDate, validateMeal, weekDates } from '../domain/meals.js';
import { visibleFood } from '../domain/pantry.js';
import { validateShoppingItem } from '../domain/shopping.js';
import { createMealService } from '../services/meals.js';
import { createPantryService } from '../services/pantry.js';
import { createShoppingService } from '../services/shopping.js';
import MealShoppingReview from './MealShoppingReview.jsx';
import MealConsumption from './MealConsumption.jsx';
import FoodDateBadge from './FoodDateBadge.jsx';
import {foodDateStatus} from '../domain/foodDates.js';
import PantryRecipes from './PantryRecipes.jsx';
import { recipeDraft } from '../domain/recipes.js';

const blank = (date) => ({ name: '', meal_date: date, meal_slot: 'Dinner', portions: '2', ingredients: '', notes: '', includes_leftovers: false });
export default function MealPlanner({ client, userId }) {
  const service = useMemo(() => createMealService(client, userId), [client, userId]);
  const pantry = useMemo(() => createPantryService(client, userId), [client, userId]);
  const shopping = useMemo(() => createShoppingService(client, userId), [client, userId]);
  const [date, setDate] = useState(todayInNZ);
  const days = weekDates(date);
  const start = days[0];
  const [meals, setMeals] = useState([]);
  const [state, setState] = useState('loading');
  const [stock, setStock] = useState([]);
  const [stockState, setStockState] = useState('loading');
  const [stockFilter, setStockFilter] = useState('All items');
  const [form, setForm] = useState(() => blank(date));
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [missing, setMissing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const active = useRef(false);
  const version = useRef(0);
  const stockVersion = useRef(0);
  const lock = useRef(false);
  const titleInput = useRef(null);
  const missingName = useRef(null);
  async function load() {
    const request = ++version.current; setState('loading');
    try {
      const records = await service.list(date);
      if (active.current && request === version.current) { setMeals(records); setState('ready'); }
    } catch { if (active.current && request === version.current) setState('error'); }
  }
  async function loadStock() {
    const request = ++stockVersion.current; setStockState('loading');
    try {
      const records = await pantry.list();
      if (active.current && request === stockVersion.current) { setStock(records); setStockState('ready'); }
    } catch { if (active.current && request === stockVersion.current) setStockState('error'); }
  }
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; version.current++; stockVersion.current++; };
  }, [service, pantry]);
  useEffect(() => { if (userId) load(); return () => { version.current++; }; }, [service, start, userId]);
  useEffect(() => { if (userId) loadStock(); }, [pantry, userId]);
  useEffect(() => { if (missing) missingName.current?.focus(); }, [missing?.meal.id]);
  async function mutate(operation, success, after) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await operation();
      if (active.current) { setMessage(success); after?.(); }
    } catch { if (active.current) setError('The change could not be confirmed. Refresh the meal plan or check your shopping list before retrying.'); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  function submit(event) {
    event.preventDefault();
    try { validateMeal(form); } catch (failure) { setError(failure.message); return; }
    mutate(() => service.save(form, editing), editing ? 'Meal plan updated.' : 'Meal planned.', () => {
      setForm(blank(form.meal_date)); setEditing(null);
      if (weekDates(form.meal_date)[0] !== start) setDate(form.meal_date); else load();
    });
  }
  function changeWeek(next) {
    if (!validMealDate(next)) return;
    setDate(next); setForm(blank(next)); setEditing(null); setMissing(null); setDeleting(null); setMessage(''); setError('');
  }
  function shiftWeek(delta) {
    const next = new Date(`${start}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + delta * 7);
    changeWeek(next.toISOString().slice(0, 10));
  }
  const change = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  function useIngredient(item) {
    try {
      const ingredients = addIngredient(form.ingredients, item.name);
      setForm((previous) => ({ ...previous, ingredients, includes_leftovers: previous.includes_leftovers || !!item.is_leftover }));
      setMessage(`${item.name} added to ingredient notes. Save the meal to keep the plan.`); setError('');
    } catch (failure) { setError(failure.message); }
  }
  function saveMissing(event) {
    event.preventDefault();
    const item = { name: missing.name, quantity: missing.quantity, unit: missing.unit, notes: `For planned meal: ${missing.meal.name} (${missing.meal.meal_date})`, purchased: false };
    try { validateShoppingItem(item); } catch (failure) { setError(failure.message); return; }
    mutate(() => shopping.save(item), 'Missing ingredient added to your shopping list.', () => setMissing(null));
  }
  return <>
    <div className="workspace-intro"><p className="eyebrow">Your household / Meals</p><h1>A little planning.<br /><span>Start with what’s at home.</span></h1><p>Plan meals for the week, make room for suitable leftovers and note what you need to buy.</p></div>
    {!userId ? <section className="panel"><h2>Make a plan for your household</h2><p className="mt-3">Sign in to save and manage meal plans.</p><a className="primary mt-4" href="#/login">Sign in to plan meals</a></section> : <>
      <div className="meal-week-controls panel mb-6"><div className="food-form"><label>Week containing<input type="date" min="2000-01-01" max="2100-12-31" required value={date} disabled={busy} onChange={(e) => changeWeek(e.target.value)} /></label></div><div className="flex flex-wrap gap-3"><button className="secondary" disabled={busy} onClick={() => shiftWeek(-1)}>Previous week</button><button className="secondary" disabled={busy} onClick={() => changeWeek(todayInNZ())}>This week</button><button className="secondary" disabled={busy} onClick={() => shiftWeek(1)}>Next week</button><button className="secondary" disabled={busy || state === 'loading'} onClick={load}>Refresh meal plan</button></div></div>
      <div className="food-workspace"><section className="panel"><h2 className="text-2xl font-semibold">{editing ? 'Edit planned meal' : 'Plan a meal'}</h2><form onSubmit={submit} className="food-form mt-4"><fieldset className="food-form" disabled={busy}><legend className="sr-only">Meal details</legend>
        <label>Meal name<input ref={titleInput} required maxLength={100} value={form.name} onChange={(e) => change('name', e.target.value)} /></label>
        <label>Meal date<input type="date" required min="2000-01-01" max="2100-12-31" value={form.meal_date} onChange={(e) => change('meal_date', e.target.value)} /></label>
        <div className="food-form-pair"><label>Meal time<select value={form.meal_slot} onChange={(e) => change('meal_slot', e.target.value)}>{MEAL_SLOTS.map((slot) => <option key={slot}>{slot}</option>)}</select></label><label>Planned portions<input type="number" required min="1" max="50" step="1" value={form.portions} onChange={(e) => change('portions', e.target.value)} /></label></div>
        <label>Ingredient notes<textarea rows={4} maxLength={2000} value={form.ingredients} onChange={(e) => change('ingredients', e.target.value)} /></label><p className="text-xs text-stone-600">Add pantry names below or write ingredients and quantities yourself. These are planning notes; stock is not reserved or deducted.</p>
        <label className="food-checkbox"><input type="checkbox" checked={form.includes_leftovers} onChange={(e) => change('includes_leftovers', e.target.checked)} />Plan to use leftovers</label>
        <label>Meal notes<textarea rows={3} maxLength={500} value={form.notes} onChange={(e) => change('notes', e.target.value)} /></label>
        <div className="flex flex-wrap gap-3"><button className="primary" type="submit">{busy ? 'Saving…' : editing ? 'Update planned meal' : 'Save meal plan'}</button>{editing && <button className="secondary" type="button" onClick={() => { setEditing(null); setForm(blank(date)); }}>Cancel meal editing</button>}</div>
      </fieldset></form><p className="mt-3" role="status">{message}</p>{error && <p role="alert" className="mt-3 text-red-800">{error}</p>}
      </section><section className="panel"><h2 className="text-2xl font-semibold">Food to plan around</h2><p className="mt-3 text-sm">Review recorded pantry food and leftovers. Follow packaging instructions; a planned date does not establish whether food is safe.</p><label className="food-filter">Pantry food for meals<select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>{['All items','Use first','Leftovers'].map((value) => <option key={value}>{value}</option>)}</select></label><button className="secondary mt-3" disabled={stockState === 'loading'} onClick={loadStock}>Refresh meal ingredients</button>
        {stockState === 'loading' && <p role="status" className="mt-3">Loading pantry ingredients…</p>}{stockState === 'error' && <p role="alert" className="mt-3">Could not load pantry ingredients. Check your pantry directly or refresh.</p>}
        {stockState === 'ready' && <><p className="mt-3 text-xs">Up to 500 recorded pantry items; quantities may need updating.</p>{!visibleFood(stock, stockFilter).filter(item=>!(item.date_type==='Use by'&&foodDateStatus(item).key==='passed')).length && <p className="mt-3">No pantry items in this view.</p>}<ul className="food-item-list">{visibleFood(stock, stockFilter).map((item) => <li key={item.id}><strong>{item.name}</strong> · {item.quantity} {item.unit} · {item.location}{item.is_leftover ? ' · Leftover' : ''}{item.use_first ? ' · Use first' : ''}<FoodDateBadge item={item}/><button className="secondary mt-3" disabled={busy} onClick={() => useIngredient(item)} aria-label={`Use ${item.name} in meal notes`}>Add to ingredient notes</button></li>)}</ul></>}
      </section></div>
      <PantryRecipes stock={stock} state={stockState} disabled={busy} onChoose={(recipe) => { setForm((previous) => ({ ...previous, ...recipeDraft(recipe) })); setEditing(null); setError(''); setMessage('Recipe copied into the meal form. Review portions, ingredient amounts and steps before saving.'); titleInput.current?.focus(); }} />
      {missing && <section className="panel mb-6"><h2 className="text-xl font-semibold">Missing ingredient for {missing.meal.name}</h2><p className="mt-2 text-sm">Check your pantry and <a className="underline" href="#/shopping">existing shopping list</a> first. Choose the quantity to add; no ingredients are generated or transferred automatically.</p><form onSubmit={saveMissing} className="food-form mt-4"><fieldset className="food-form" disabled={busy}><legend className="sr-only">Missing ingredient details</legend><label>Missing ingredient name<input ref={missingName} required maxLength={100} value={missing.name} onChange={(e) => setMissing((previous) => ({ ...previous, name: e.target.value }))} /></label><div className="food-form-pair"><label>Missing ingredient quantity<input required type="number" min="0.001" max="100000" step="0.001" value={missing.quantity} onChange={(e) => setMissing((previous) => ({ ...previous, quantity: e.target.value }))} /></label><label>Missing ingredient unit<input required maxLength={30} value={missing.unit} onChange={(e) => setMissing((previous) => ({ ...previous, unit: e.target.value }))} /></label></div><div className="flex flex-wrap gap-3"><button className="primary" type="submit">Add missing ingredient to shopping</button><button className="secondary" type="button" onClick={() => setMissing(null)}>Cancel missing ingredient</button></div></fieldset></form></section>}
      <section className="panel mb-8"><h2 className="text-2xl font-semibold">Your week: {mealDateLabel(days[0])} – {mealDateLabel(days[6])}</h2><p className="mt-3 text-sm">Up to 100 planned meals per displayed week. Ingredient notes are snapshots and do not update when pantry food changes.</p>
        {state === 'loading' && <p role="status" className="mt-3">Loading meal plan…</p>}{state === 'error' && <p role="alert" className="mt-3">Could not load this meal plan. Check your connection and refresh.</p>}
        {state === 'ready' && <div className="meal-week-grid mt-5">{days.map((day) => <section key={day} className="meal-day"><h3 className="font-semibold">{mealDateLabel(day)}</h3>{!meals.some(({ meal_date }) => meal_date === day) && <p className="mt-3 text-sm text-stone-600">No meals planned.</p>}<ul className="mt-3 space-y-4">{meals.filter(({ meal_date }) => meal_date === day).sort((a, b) => MEAL_SLOTS.indexOf(a.meal_slot) - MEAL_SLOTS.indexOf(b.meal_slot)).map((meal) => <li key={meal.id} className="meal-plan-card"><p className="eyebrow">{meal.meal_slot} · {meal.portions} portions</p><h4 className="mt-2 text-lg font-semibold">{meal.name}</h4>{meal.includes_leftovers && <p className="mt-2 text-sm">Plans to use leftovers</p>}{meal.ingredients && <p className="mt-2 whitespace-pre-wrap text-sm">{meal.ingredients}</p>}{meal.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{meal.notes}</p>}
          <div className="mt-3 flex flex-wrap gap-2"><button className="secondary" disabled={busy} aria-label={`Edit meal ${meal.name}`} onClick={() => { setForm(meal); setEditing(meal.id); setError(''); titleInput.current?.focus(); }}>Edit</button><button className="secondary" disabled={busy} aria-label={`Delete meal ${meal.name}`} onClick={() => setDeleting(meal.id)}>Delete</button><button className="secondary" disabled={busy} aria-label={`Shop for ${meal.name}`} onClick={() => setMissing({ meal, name: '', quantity: '', unit: '' })}>Add missing ingredient</button></div>
          <MealShoppingReview meal={meal} stock={stock} onChoose={name=>setMissing({meal,name,quantity:'',unit:''})}/><MealConsumption meal={meal} stock={stock} client={client} userId={userId} disabled={busy||stockState!=='ready'} onSaved={async()=>{await load();await loadStock();}}/>{deleting === meal.id && <div className="mt-3"><p>Delete {meal.name} from your plan?</p><button className="secondary mt-2" disabled={busy} onClick={() => mutate(() => service.remove(meal.id), 'Meal plan deleted.', () => { if (editing === meal.id) { setEditing(null); setForm(blank(date)); } if (missing?.meal.id === meal.id) setMissing(null); setDeleting(null); load(); })}>Confirm meal deletion</button> <button className="secondary" disabled={busy} onClick={() => setDeleting(null)}>Keep planned meal</button></div>}
        </li>)}</ul></section>)}</div>}
      </section>
    </>}
  </>;
}
