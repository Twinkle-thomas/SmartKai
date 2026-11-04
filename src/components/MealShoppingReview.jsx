import {useState} from 'react';
import {matchingPantryItems} from '../domain/shopping.js';
export function ingredientLines(notes){return notes.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>({name:line.split(':')[0].trim(),original:line})).filter(item=>item.name.length<=100);}
export default function MealShoppingReview({meal,stock,onChoose}){
 const [open,setOpen]=useState(false);const entries=ingredientLines(meal.ingredients??'');
 return entries.length>0&&<div className="mt-3"><button className="secondary" onClick={()=>setOpen(!open)} aria-expanded={open}>Review meal ingredients for shopping</button>{open&&<><p className="mt-2 text-sm">Name matching does not establish quantity sufficiency. Review each missing ingredient and its amount before adding.</p><ul className="mt-3 space-y-3">{entries.map((item,i)=><li key={i}><strong>{item.original}</strong><p className="text-sm">{matchingPantryItems(item.name,stock).length?'Name recorded in pantry — check the amount.':'No exact pantry name match — check spelling and stock.'}</p><button className="secondary mt-2" onClick={()=>onChoose(item.name)}>Review shopping addition: {item.name}</button></li>)}</ul></>}</div>;
}
