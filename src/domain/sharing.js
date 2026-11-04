import { todayInNZ,validMealDate } from './meals.js';
import { validateShoppingItem } from './shopping.js';
export const DEMO_HOUSEHOLDS=['Demo household A','Demo household B','Demo household C'];
export const DEMO_AREAS=['Auckland','Wellington','Christchurch','Hamilton','Dunedin','Other demo area'];
export function validateOffer(item, now=new Date()) {
  const food=validateShoppingItem({...item,purchased:false});
  if(!DEMO_HOUSEHOLDS.includes(item.donor)||!DEMO_AREAS.includes(item.area))throw new Error('Choose a demo household and area.');
  if(!validMealDate(item.best_before)||item.best_before<todayInNZ(now))throw new Error('Choose a best-before date today or later for this simulation.');
  if(item.confirmed_simulation!==true)throw new Error('Confirm the simulation and item condition.');
  return {name:food.name,quantity:food.quantity,unit:food.unit,notes:food.notes,donor:item.donor,area:item.area,best_before:item.best_before,condition:'Unopened shelf-stable',pantry_item_id:item.pantry_item_id||null};
}
export function sharingTransition(offer,action,actor,now=new Date()) {
  if(!DEMO_HOUSEHOLDS.includes(actor))throw new Error('Choose a demo household.');
  if(action==='reserve'&&offer.status==='Available'&&actor!==offer.donor){
    if(offer.best_before<todayInNZ(now))throw new Error('This offer is outside the demonstration date window.');
    return {status:'Reserved',recipient:actor};
  }
  if(action==='collect'&&offer.status==='Reserved'&&actor===offer.recipient)return {status:'Collected',recipient:actor};
  if(action==='cancel'&&offer.status==='Reserved'&&actor===offer.recipient)return {status:'Available',recipient:null};
  if(action==='withdraw'&&['Available','Reserved'].includes(offer.status)&&actor===offer.donor)return {status:'Withdrawn',recipient:null};
  throw new Error('This demo action is not available for the selected household and offer state.');
}
