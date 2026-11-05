import {INGREDIENTS} from '../data/ingredients.js';
import IngredientArt from './IngredientArt.jsx';
import FoodDateBadge from './FoodDateBadge.jsx';

const singular={items:'item',loaves:'loaf',bags:'bag',bottles:'bottle',packs:'pack',cans:'can',cartons:'carton',tubs:'tub',portions:'portion'};
export default function PantryStockCards({items}){
 return <ul className="pantry-stock-grid">{items.map(item=>{
  const illustration=INGREDIENTS.find(entry=>entry.name.toLowerCase()===item.name.trim().toLowerCase());
  const unit=Number(item.quantity)===1?(singular[item.unit]??item.unit):item.unit;
  return <li key={item.id} className="pantry-stock-card"><div className="pantry-stock-top"><span className="pantry-stock-art" aria-hidden="true"><IngredientArt kind={illustration?.art??'pack'}/></span><div><p className="eyebrow">{item.category??illustration?.category??'Pantry item'}</p><h3>{item.name}</h3></div>{item.use_first&&<span className="pantry-stock-priority">Use first</span>}</div><dl className="pantry-stock-details"><div><dt>Recorded quantity</dt><dd>{item.quantity} <span>{unit}</span></dd></div><div><dt>Stored in</dt><dd className="pantry-stock-location">{item.location}</dd></div></dl>{item.food_date&&<FoodDateBadge item={item}/>}</li>;
 })}</ul>;
}
