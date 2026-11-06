import { useEffect, useRef, useState } from 'react';
import { CATEGORIES } from '../domain/pantry.js';
import { todayInNZ } from '../domain/meals.js';
import { compareWaste, DISCARD_REASONS, kilograms, periodSummary, REASON_ADVICE, shiftDate, validateDiscard, weekStart } from '../domain/waste.js';
import { WASTE_SCENARIOS } from '../data/wasteScenarios.js';
import { createWasteService } from '../services/waste.js';

const blank = () => ({ event_date:todayInNZ(),food_name:'',category:'Other',quantity:'',unit:'g',reason:DISCARD_REASONS[0],notes:'' });
const mass = kg => kg == null ? 'Not measured in kg' : `${Number(kg.toFixed(9))} kg`;

function Breakdown({ title, groups }) {
  return <section className="panel"><h2 className="text-xl font-semibold">{title}</h2><ul className="food-item-list">{Object.entries(groups).map(([name,group]) => <li key={name}><strong>{name}</strong><p>{group.count} logs · {mass(group.unmeasured === group.count ? null : group.kg)}{group.unmeasured > 0 && ` · ${group.unmeasured} unmeasured in kg`}</p></li>)}</ul>{!Object.keys(groups).length && <p>No logs in this week.</p>}</section>;
}
export default function WasteDashboard({ client, userId }) {
  const [mode,setMode] = useState('own');
  const [form,setForm] = useState(blank);
  const [baseline,setBaseline] = useState('');
  const [savedBaseline,setSavedBaseline] = useState(null);
  const [comparison,setComparison] = useState(() => shiftDate(weekStart(todayInNZ()),-7));
  const [events,setEvents] = useState([]);
  const [state,setState] = useState('loading');
  const [revision,setRevision] = useState(0);
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [message,setMessage] = useState('');
  const request = useRef(null), lock = useRef(false);
  const example = WASTE_SCENARIOS.find(s => s.id === mode);
  const base = example?.baseline ?? baseline;
  const current = example?.comparison ?? comparison;
  const trendStart = shiftDate(weekStart(todayInNZ()),-49);
  const rangeStart = [trendStart,baseline,comparison].filter(Boolean).sort()[0];
  const rangeEnd = [shiftDate(weekStart(todayInNZ()),6),shiftDate(comparison,6),baseline && shiftDate(baseline,6)].filter(Boolean).sort().at(-1);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    createWasteService(client,userId).baseline().then(value => { if(active){setBaseline(value ?? '');setSavedBaseline(value);} }).catch(() => {if(active)setError('Could not load the saved baseline. Retry by refreshing the page.');});
    return () => {active=false;};
  },[client,userId]);
  useEffect(() => {
    if (!userId || mode !== 'own') return;
    let active = true; setState('loading');
    createWasteService(client,userId).list(rangeStart,rangeEnd).then(rows => {if(active){setEvents(rows);setState('ready');}}).catch(() => {if(active)setState('error');});
    return () => {active=false;};
  },[client,userId,rangeStart,rangeEnd,revision,mode]);
  function change(key,value) {setForm(old => ({...old,[key]:value}));}
  async function submit(event) {
    event?.preventDefault(); if(lock.current)return;
    try {validateDiscard(form);} catch(e){setError(e.message);return;}
    lock.current=true;setBusy(true);setError('');setMessage('');
    request.current ??= crypto.randomUUID();
    try {await createWasteService(client,userId).record(form,request.current);request.current=null;setForm(blank());setMessage('Discard saved. It appears once in your waste history.');setRevision(v=>v+1);}
    catch {setError('Save could not be confirmed. Retry this unchanged request; its identifier prevents duplicate recording.');}
    finally {lock.current=false;setBusy(false);}
  }
  async function saveBaseline() {
    if(!baseline || busy)return;
    setBusy(true);setError('');
    try {await createWasteService(client,userId).setBaseline(baseline);setSavedBaseline(baseline);setMessage('Baseline week saved.');}
    catch {setError('Could not save the baseline. Please try again.');}
    finally {setBusy(false);}
  }
  const records = example?.events ?? events;
  const summary = periodSummary(records,current);
  const baselineSummary = base ? periodSummary(records,base) : null;
  const comparisonResult = baselineSummary && (example || savedBaseline === base) ? compareWaste(baselineSummary,summary) : null;
  const weeks = example ? [base,current] : Array.from({length:8},(_,i)=>shiftDate(trendStart,i*7));
  const ready = !!example || state === 'ready';
  return <>
    <div className="workspace-intro"><p className="eyebrow">Your household / Recorded food waste</p><h1>Record. Reflect.<br/><span>See what changes.</span></h1><p>Track reported discards separately from your <a className="underline" href="#/progress">questionnaire check-ins</a>. These logs do not establish actual household waste totals or the app’s effectiveness.</p></div>
    <section className="panel mb-6"><label className="food-form">Dashboard data<select value={mode} disabled={busy || !!request.current} onChange={e=>{setMode(e.target.value);setMessage('');}}><option value="own">My recorded history</option>{WASTE_SCENARIOS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>{example && <p role="status" className="mt-3 font-semibold">Simulated example dashboard — fictional data, not saved to your account.</p>}<p className="mt-3 text-sm">Kilograms include recorded mass only: 1 kg = 1,000 g = 1,000,000 mg. Items, portions, bags and volume units are unmeasured in kg; no average weights or densities are assumed. Missing logs are not zero waste. Consumption and meal plans are not counted as avoided waste.</p></section>
    {!example && !userId ? <section className="panel"><h2>Sign in to keep a waste log</h2><a className="primary mt-4" href="#/login">Sign in</a></section> : <>
      {!example && <section className="panel mb-6"><h2 className="text-2xl font-semibold">Food Waste Log</h2><p className="mt-3">For food already recorded in your pantry or leftovers, use that item’s “Record consumption or disposal” action. Log it here only if it is not already recorded there.</p><div className="flex flex-wrap gap-4 mt-3"><a href="#/pantry" className="text-link">Open pantry ↗</a><a href="#/leftovers" className="text-link">Open leftovers ↗</a></div><form className="food-form mt-5" onSubmit={submit}><fieldset className="food-form" disabled={busy || !!request.current}>
        <label>Discard date<input required type="date" min="2000-01-01" max={todayInNZ()} value={form.event_date} onChange={e=>change('event_date',e.target.value)}/></label>
        <label>Discarded food name<input required maxLength={100} value={form.food_name} onChange={e=>change('food_name',e.target.value)}/></label>
        <label>Waste category<select value={form.category} onChange={e=>change('category',e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
        <div className="food-form-pair"><label>Discarded amount<input required type="number" min="0.001" max="100000" step="0.001" value={form.quantity} onChange={e=>change('quantity',e.target.value)}/></label><label>Discard unit<input required maxLength={30} list="waste-units" value={form.unit} onChange={e=>change('unit',e.target.value)}/><datalist id="waste-units">{['g','kg','mg','items','portions','ml','L'].map(u=><option key={u} value={u}/>)}</datalist></label></div>
        <label>Discard reason<select value={form.reason} onChange={e=>change('reason',e.target.value)}>{DISCARD_REASONS.map(r=><option key={r}>{r}</option>)}</select></label>
        <label>Waste notes (optional)<textarea maxLength={500} value={form.notes} onChange={e=>change('notes',e.target.value)}/></label>
        <button className="primary">{busy?'Saving…':'Save discard'}</button>
      </fieldset></form>{request.current && !busy && <button className="secondary mt-3" onClick={()=>submit()}>Retry same discard</button>}</section>}
      {error && <p role="alert" className="panel mb-6">{error}</p>}{message && <p role="status" className="panel mb-6">{message}</p>}
      <section className="panel mb-6"><h2 className="text-2xl font-semibold">Weekly recorded waste</h2><div className="food-form mt-4"><label>Comparison week (choose any day)<input type="date" min="2000-01-03" max={todayInNZ()} value={current} disabled={!!example || busy} onChange={e=>{if(e.target.value)setComparison(weekStart(e.target.value));}}/></label><label>Baseline week (choose any day)<input type="date" min="2000-01-03" max={todayInNZ()} value={base} disabled={!!example || busy} onChange={e=>{if(e.target.value)setBaseline(weekStart(e.target.value));}}/></label>{!example && <button className="secondary" disabled={!baseline || busy} onClick={saveBaseline}>Save explicit baseline week</button>}</div><p className="mt-3">Weeks run Monday–Sunday using the recorded NZ calendar date. Only complete, separate seven-day periods with logs entirely in mass units are compared. Missing logging days may still affect any comparison.</p>
        {!ready ? <><p role={state==='error'?'alert':'status'}>{state==='error'?'Could not load waste history. No totals are shown.':'Loading recorded waste…'}</p>{state==='error'&&<button className="secondary" onClick={()=>setRevision(v=>v+1)}>Retry waste history</button>}</> : <>
          <p className="mt-5 text-xl font-semibold">{summary.start} – {summary.end}: {summary.count ? mass(summary.kg) : 'No logs'}</p><p>{summary.count} discard logs · {summary.unmeasured} quantities unmeasured in kg{summary.unmeasured > 0 ? ' · kg total is partial' : ''}</p>
          {baselineSummary && <p className="mt-3">Baseline {baselineSummary.start} – {baselineSummary.end}: {baselineSummary.count ? mass(baselineSummary.kg) : 'No logs'} · {baselineSummary.unmeasured} unmeasured in kg</p>}
          <p role="status" className="mt-3">{comparisonResult?.message ?? 'Choose and save an explicit baseline week to compare recorded mass.'}</p>
          <div className="progress-table-wrap"><table className="progress-table"><caption>{example?'Simulated weekly trend':'Weekly recorded trend (eight weeks, including this partial week)'}</caption><thead><tr><th scope="col">Week starting</th><th scope="col">Recorded mass</th><th scope="col">Logs</th><th scope="col">Unmeasured in kg</th></tr></thead><tbody>{weeks.map(start=>{const s=periodSummary(records,start);return <tr key={start}><th scope="row">{start}</th><td>{s.count?mass(s.kg):'No logs'}</td><td>{s.count}</td><td>{s.unmeasured}</td></tr>;})}</tbody></table></div>
        </>}
      </section>
      {ready && <><div className="grid gap-6 md:grid-cols-2 mb-6"><Breakdown title="Discard categories — comparison week" groups={summary.categories}/><Breakdown title="Discard reasons — comparison week" groups={summary.reasons}/></div>
        <details className="panel mb-6"><summary>Optional prevention advice from recorded reasons</summary><p className="mt-3">These links suggest relevant tools; they do not assign or change a behaviour profile.</p><ul className="food-item-list">{Object.keys(summary.reasons).map(reason=>{const advice=REASON_ADVICE[reason];return advice&&<li key={reason}><a href={advice.href} className="text-link">{advice.text} ↗</a><p>Related provisional research category: {advice.profile}</p></li>;})}</ul><a href="#/personalisation" className="text-link">Complete the unchanged five-question assessment ↗</a></details>
        <section className="panel mb-8"><h2 className="text-2xl font-semibold">Persistent discard history{example?' — simulated':''}</h2><p className="mt-3">{example?'Example period':`Loaded ${rangeStart} through ${rangeEnd}`}. Historical records are kept. Legacy categories are “Other”; their dates use the original recorded timestamp in NZ time.</p><ul className="food-item-list">{records.map(row=><li key={row.id}><strong>{row.food_name}</strong><p>{row.event_date} · {row.category} · {row.quantity} {row.unit} · {mass(kilogramsForRow(row))}</p><p>{row.reason}</p>{row.notes && <p>{row.notes}</p>}{row.legacy_metadata && <p>Legacy record — category not captured at discard time.</p>}</li>)}</ul>{!records.length && <p>No logs in the loaded period.</p>}</section>
      </>}
    </>}
  </>;
}

function kilogramsForRow(row) {return kilograms(row.quantity,row.unit);}
