import {expect,test,vi} from 'vitest';
import {validateFood} from '../src/domain/pantry.js';
import {validateShoppingItem} from '../src/domain/shopping.js';
import {createInventoryService} from '../src/services/inventory.js';
import {PROFILE_ACTIONS} from '../src/domain/toolActions.js';
import {INDICATORS} from '../src/domain/personalisation.js';
import {storageFoodId} from '../src/data/foodStorage.js';
import {readRoute} from '../src/navigation.js';
const food={name:'Rice',quantity:1,unit:'bag',location:'Pantry',date_type:'Not recorded',is_leftover:false};
test('new dates and NZD fields validate without inventing defaults',()=>{
 expect(validateFood(food)).toMatchObject({purchase_date:null,stored_date:null,prepared_date:null});
 for(const key of ['purchase_date','stored_date','prepared_date'])expect(()=>validateFood({...food,[key]:'2026-02-30'})).toThrow();
 expect(validateShoppingItem({...food,purchased:false,cost_nzd:'4.50',category:'Grains'})).toMatchObject({cost_nzd:4.5,category:'Grains'});
 for(const cost_nzd of ['NaN',-1,'1.001',100001])expect(()=>validateShoppingItem({...food,purchased:false,cost_nzd})).toThrow();
});
test('inventory service rejects anonymous calls and propagates database failure',async()=>{
 await expect(createInventoryService(null,null).outcome('id',1,'Used')).rejects.toThrow('Sign in');
 const client={rpc:vi.fn().mockResolvedValue({error:new Error('stale quantity')})};await expect(createInventoryService(client,'A').consume('meal',[{id:'rice',quantity:'1.25'}])).rejects.toThrow('stale');expect(client.rpc).toHaveBeenCalledWith('confirm_meal_consumption',{p_meal:'meal',p_items:[{id:'rice',quantity:1.25}]});
});
test('all five existing profiles have an actionable explanation and food details keep valid routes',()=>{
 for(const indicator of INDICATORS){expect(PROFILE_ACTIONS[indicator.profile].why).toBeTruthy();expect(readRoute(PROFILE_ACTIONS[indicator.profile].href)).not.toBe('not-found');}
 expect(storageFoodId('Carrot')).toBe('carrots');expect(storageFoodId('Unknown food')).toBeUndefined();expect(readRoute('#/storage?food=carrots')).toBe('storage');
});
