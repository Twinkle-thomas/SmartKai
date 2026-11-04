import {validateFood} from '../domain/pantry.js';
export function createInventoryService(client,userId){
  async function rpc(name,args){if(!client||!userId)throw new Error('Sign in to update inventory.');const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
  return {
    outcome(id,quantity,outcome,reason=''){return rpc('record_food_outcome',{p_id:id,p_quantity:Number(quantity),p_outcome:outcome,p_reason:reason});},
    consume(meal,items){return rpc('confirm_meal_consumption',{p_meal:meal,p_items:items.map(item=>({id:item.id,quantity:Number(item.quantity)}))});},
    transfer(id,food){return rpc('transfer_shopping_to_pantry',{p_id:id,p_food:validateFood(food)});},
    async history(){if(!client||!userId)throw new Error('Sign in to view outcomes.');const {data,error}=await client.from('inventory_events').select('*').eq('owner_id',userId).order('created_at',{ascending:false}).limit(100);if(error)throw error;return data;}
  };
}
