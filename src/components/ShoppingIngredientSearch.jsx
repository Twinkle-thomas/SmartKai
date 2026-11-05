import {useState} from 'react';
import {INGREDIENTS} from '../data/ingredients.js';
import {CATEGORIES} from '../domain/pantry.js';
import {matchingPantryItems} from '../domain/shopping.js';
import IngredientArt from './IngredientArt.jsx';

const popular=['apples','bread','milk','eggs','carrots','rice'];
export default function ShoppingIngredientSearch({value,onChange,onChoose,inputRef,stock=[],shopping=[]}){
 const [expanded,setExpanded]=useState(false),[category,setCategory]=useState('All foods');
 const query=value.trim().toLocaleLowerCase('en-NZ');
 const matches=INGREDIENTS.filter(item=>(category==='All foods'||item.category===category)&&item.name.toLocaleLowerCase('en-NZ').includes(query));
 const shown=!query&&!expanded&&category==='All foods'?popular.map(id=>INGREDIENTS.find(item=>item.id===id)):matches;
 return <div className="shopping-ingredient-search">
  <label htmlFor="shopping-food-name">Shopping item name</label><div className="shopping-search-field"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.8"/><path d="m15 15 5 5" stroke="currentColor" strokeWidth="1.8"/></svg><input id="shopping-food-name" ref={inputRef} required maxLength={100} value={value} onChange={e=>onChange(e.target.value)} placeholder="Search food or type your own item…" autoComplete="off" aria-describedby="shopping-search-help"/></div>
  <div className="shopping-browse-heading"><span className="eyebrow">{query?'Matching ingredients':expanded?'Ingredient catalogue':'Popular ingredients'}</span><label><span className="sr-only">Browse food category</span><select value={category} onChange={e=>{setCategory(e.target.value);setExpanded(true);}}>{['All foods',...CATEGORIES].map(value=><option key={value}>{value}</option>)}</select></label></div>
  <ul className="shopping-food-options" aria-label="Ingredient suggestions">{shown.map(item=>{
    const pantry=matchingPantryItems(item.name,stock);const onList=shopping.some(entry=>!entry.purchased&&entry.name.trim().toLowerCase()===item.name.toLowerCase());
    return <li key={item.id}><button type="button" className={query===item.name.toLowerCase()?'is-matched':''} onClick={()=>onChoose(item)} aria-label={`Choose ${item.name}`}><span className="shopping-food-art"><IngredientArt kind={item.art}/></span><span className="shopping-option-copy"><strong>{item.name}</strong><span>{item.category}{pantry.length?' · In pantry':''}{onList?' · On your list':''}</span></span><span className="shopping-option-add" aria-hidden="true">＋</span></button></li>;
  })}</ul>
  {!shown.length&&<p className="shopping-no-match">No starter ingredients match this search. You can use “{value.trim()}” as a custom item, or change the category.</p>}
  {!query&&category==='All foods'&&<button className="shopping-browse-toggle" type="button" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Show popular ingredients':`Browse all ${INGREDIENTS.length} ingredients`} <span aria-hidden="true">{expanded?'↑':'↓'}</span></button>}
  <p className="shopping-search-help" id="shopping-search-help">Choose a pictured ingredient to fill its name, category and unit, or type any item. Review the quantity below, then add it to your list.</p>
 </div>;
}
