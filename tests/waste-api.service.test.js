import { expect, test, vi } from 'vitest';
import { createWasteService } from '../src/services/waste.js';
test('history paginates without silently losing rows and scopes every request by owner/date/outcome',async()=>{
 const query={};for(const method of ['select','eq','gte','lte','order'])query[method]=vi.fn(()=>query);
 query.range=vi.fn().mockResolvedValueOnce({data:Array.from({length:500},(_,i)=>({id:i}))}).mockResolvedValueOnce({data:[{id:500}]});
 const client={from:vi.fn(()=>query)};const rows=await createWasteService(client,'A').list('2026-10-05','2026-10-18');
 expect(rows).toHaveLength(501);expect(query.range.mock.calls).toEqual([[0,499],[500,999]]);expect(query.eq).toHaveBeenCalledWith('owner_id','A');expect(query.eq).toHaveBeenCalledWith('outcome','Discarded');expect(query.gte).toHaveBeenCalledWith('event_date','2026-10-05');
});
test('signed out cannot fetch or write; errors are not successful empty histories',async()=>{
 await expect(createWasteService(null,null).list('2026-10-05','2026-10-18')).rejects.toThrow('Sign in');
 const q={};for(const m of ['select','eq','gte','lte','order'])q[m]=()=>q;q.range=async()=>({error:new Error('offline')});
 await expect(createWasteService({from:()=>q},'B').list('2026-10-05','2026-10-18')).rejects.toThrow('offline');
});
