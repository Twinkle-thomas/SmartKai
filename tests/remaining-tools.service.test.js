import {expect,test,vi} from 'vitest';
import {foodDateStatus} from '../src/domain/foodDates.js';
import {validateFood,visibleFood} from '../src/domain/pantry.js';
import {normalizeBarcode} from '../src/domain/barcodes.js';
import {lookupBarcode} from '../src/services/barcodes.js';
import {sharingTransition,validateOffer} from '../src/domain/sharing.js';
import {createSharingService} from '../src/services/sharing.js';
import {pantryRecipes} from '../src/domain/recipes.js';
test('food dates distinguish preparation, best-before and use-by at NZ day boundaries',()=>{
  const now=new Date('2026-11-04T12:30:00Z'); // 5 Nov NZDT
  expect(foodDateStatus({date_type:'Use by',food_date:'2026-11-04'},now)).toMatchObject({key:'passed',days:-1});
  expect(foodDateStatus({date_type:'Best before',food_date:'2026-11-05'},now).key).toBe('today');
  expect(foodDateStatus({date_type:'Best before',food_date:'2026-11-08'},now,3).key).toBe('soon');
  expect(foodDateStatus({date_type:'Best before',food_date:'2026-11-08'},now,1).key).toBe('later');
  expect(foodDateStatus({date_type:'Prepared on',food_date:'2026-11-01'},now).key).toBe('undated');
});
test('leftover fields validate categories, planned dates and frozen location; terminal entries leave active views',()=>{
  const food={name:'Soup',quantity:2,unit:'portions',location:'Fridge',date_type:'Not recorded',is_leftover:true,notes:'',category:'Prepared meals',planned_use_date:'2026-11-06',leftover_status:'Available'};
  expect(validateFood(food).planned_use_date).toBe('2026-11-06');
  for(const patch of [{category:'Invalid'},{planned_use_date:'2026-02-30'},{leftover_status:'Frozen'},{is_leftover:false}])expect(()=>validateFood({...food,...patch})).toThrow();
  expect(visibleFood([{...food,leftover_status:'Used'},{...food,leftover_status:'Discarded'},{...food,leftover_status:'Frozen',location:'Freezer'}],'Leftovers')).toHaveLength(1);
  expect(pantryRecipes([{name:'Carrots',leftover_status:'Used'},{name:'Red lentils'}])).toEqual([]);
  expect(pantryRecipes([{name:'Carrots',date_type:'Use by',food_date:'2000-01-01'},{name:'Red lentils'}])).toEqual([]);
});
test('barcode validation and catalog lookup preserve explicit review and handle unavailable data',async()=>{
  expect(normalizeBarcode('3017 6204 22003')).toBe('3017620422003');
  expect(()=>normalizeBarcode('3017620422004')).toThrow();expect(()=>normalizeBarcode('abc')).toThrow();
  const fetcher=vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({status:'success',product:{product_name:'Test spread',brands:'Demo',quantity:'200 g'}})});
  const product=await lookupBarcode('3017620422003',{fetcher});
  expect(product.name).toBe('Test spread');expect(product).not.toHaveProperty('food_date');expect(product).not.toHaveProperty('quantity');
  await lookupBarcode('3017620422003',{fetcher});expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockResolvedValue({ok:false,status:404});expect(await lookupBarcode('3274080005003',{fetcher})).toBeNull();
  fetcher.mockResolvedValue({ok:false,status:503});await expect(lookupBarcode('012345678905',{fetcher})).rejects.toThrow('unavailable');
});
const offer={id:'offer-a',name:'Rice',quantity:1,unit:'bag',area:'Auckland',donor:'Demo household A',best_before:'2099-11-10',notes:'',confirmed_simulation:true,status:'Available',recipient:null};
test('sharing is an explicitly confirmed simulation with valid actor/state transitions',()=>{
  expect(validateOffer(offer).condition).toBe('Unopened shelf-stable');
  expect(()=>validateOffer({...offer,confirmed_simulation:false})).toThrow();
  expect(()=>validateOffer({...offer,best_before:'2000-01-01'})).toThrow();
  expect(()=>sharingTransition(offer,'reserve','Demo household A')).toThrow();
  const reserved={...offer,...sharingTransition(offer,'reserve','Demo household B')};
  expect(reserved.status).toBe('Reserved');
  expect(sharingTransition(reserved,'collect','Demo household B').status).toBe('Collected');
  expect(sharingTransition(reserved,'cancel','Demo household B')).toEqual({status:'Available',recipient:null});
  expect(sharingTransition(reserved,'withdraw','Demo household A')).toEqual({status:'Withdrawn',recipient:null});
  expect(()=>sharingTransition(reserved,'collect','Demo household C')).toThrow();
});
test('sharing persistence is owner-scoped and stale state changes fail without a returned row',async()=>{
  const query={};for(const key of ['select','eq','order','insert','update','delete'])query[key]=vi.fn(()=>query);
  query.limit=vi.fn().mockResolvedValue({data:[],error:null});query.single=vi.fn().mockResolvedValue({data:{id:'offer-a'},error:null});
  const service=createSharingService({from:()=>query},'owner-a');await service.list();await service.save(offer);await service.act(offer,'reserve','Demo household B');
  expect(query.eq).toHaveBeenCalledWith('owner_id','owner-a');expect(query.eq).toHaveBeenCalledWith('status','Available');
  query.single.mockResolvedValue({data:null,error:null});await expect(service.act(offer,'reserve','Demo household B')).rejects.toThrow();
});
