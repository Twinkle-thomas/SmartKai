import { useState, useRef } from 'react';
import { foodDateStatus } from '../domain/foodDates.js';
import { todayInNZ } from '../domain/meals.js';
import { validateDiscard } from '../domain/waste.js';
import { createInventoryService } from '../services/inventory.js';
import { createWasteService } from '../services/waste.js';

export default function InventoryOutcome({ item, client, userId, onSaved }) {
 const [open,setOpen]=useState(false),[amount,setAmount]=useState(String(item.quantity)),[outcome,setOutcome]=useState('Used'),[reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [date,setDate]=useState(todayInNZ),[notes,setNotes]=useState('');
 const lock=useRef(false),request=useRef(null);
 const expired=item.date_type==='Use by' && foodDateStatus(item).key==='passed';
 async function submit(e) {
  e?.preventDefault();if(lock.current)return;
  const discard={event_date:date,food_name:item.name,category:item.category??'Other',quantity:amount,unit:item.unit,reason,notes};
  if(outcome==='Discarded') {try{validateDiscard(discard);}catch(validation){setError(validation.message);return;}}
  lock.current=true;setBusy(true);setError('');
  try {
   if(outcome==='Discarded') {request.current??=crypto.randomUUID();await createWasteService(client,userId).record(discard,request.current,item.id);}
   else await createInventoryService(client,userId).outcome(item.id,amount,outcome,reason);
   request.current=null;setOpen(false);await onSaved();
  } catch {setError(request.current?'Discard save could not be confirmed. Retry the same request to avoid double-counting.':'Could not confirm the outcome. Refresh the pantry before retrying.');}
  finally {lock.current=false;setBusy(false);}
 }
 return <div className="mt-3">{!open ? <button className="secondary" onClick={()=>{setAmount(String(item.quantity));setOpen(true);if(expired)setOutcome('Discarded');}}>Record consumption or disposal</button> : <form onSubmit={submit} className="food-form"><fieldset className="food-form" disabled={busy || !!request.current || (!!error && outcome==='Used')}><legend>Record an actual outcome for {item.name}</legend>
  <label>Outcome<select value={outcome} onChange={e=>setOutcome(e.target.value)}><option disabled={expired}>Used</option><option>Discarded</option></select></label>{expired&&<p>Do not consume food past its use-by date.</p>}
  <label>Amount in {item.unit}<input required type="number" min="0.001" max={item.quantity} step="0.001" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
  {outcome==='Discarded' && <><label>Discard date<input required type="date" min="2000-01-01" max={todayInNZ()} value={date} onChange={e=>setDate(e.target.value)}/></label><label>Disposal reason<textarea required maxLength={300} value={reason} onChange={e=>setReason(e.target.value)}/></label><label>Discard notes (optional)<textarea maxLength={500} value={notes} onChange={e=>setNotes(e.target.value)}/></label><p>This discard is also recorded once in your <a href="#/waste" className="underline">Food Waste Log</a>. Items and portions remain unmeasured in kg.</p></>}
  <p className="text-sm">Only the confirmed amount is removed. Whole-entry outcomes stay in inventory history.</p><div className="flex flex-wrap gap-2"><button className="primary">Confirm outcome</button><button className="secondary" type="button" onClick={()=>setOpen(false)}>Cancel outcome</button></div>
 </fieldset>{error && <><p role="alert">{error}</p>{request.current?<button type="button" disabled={busy} className="secondary" onClick={()=>submit()}>Retry same discard</button>:outcome==='Used'&&<button type="button" className="secondary" onClick={onSaved}>Refresh pantry after outcome</button>}</>}</form>}</div>;
}
