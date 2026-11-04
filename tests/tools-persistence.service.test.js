import { expect, test, vi } from 'vitest';
import { createPantryService } from '../src/services/pantry.js';
import { createProgressService } from '../src/services/progress.js';

test('pantry service scopes CRUD and rejects mutations without a returned row', async () => {
  const query = {};
  for (const method of ['select','eq','in','order','insert','update','delete']) query[method] = vi.fn(() => query);
  query.limit = vi.fn().mockResolvedValue({ data: [], error: null });
  query.single = vi.fn().mockResolvedValue({ data: { id: 'food-1' }, error: null });
  const client = { from: vi.fn(() => query) };
  const service = createPantryService(client, 'owner-a');
  await service.list();
  expect(query.eq).toHaveBeenCalledWith('owner_id', 'owner-a');
  const item = { name: ' Rice ', quantity: '2', unit: 'kg', location: 'Pantry', date_type: 'Not recorded', food_date: '', notes: '' };
  await service.save(item);
  expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Rice', quantity: 2, owner_id: 'owner-a', food_date: null }));
  await service.save(item, 'food-1');
  expect(query.eq).toHaveBeenCalledWith('id', 'food-1');
  expect(query.update.mock.calls[0][0]).not.toHaveProperty('owner_id');
  query.single.mockResolvedValue({ data: null, error: null });
  await expect(service.save(item, 'foreign-id')).rejects.toThrow();
  await expect(service.remove('foreign-id')).rejects.toThrow();
  await expect(createPantryService(client, null).list()).rejects.toThrow('Sign in');
});

test('progress queries exclude predefined scenarios and independently request first and latest', async () => {
  const queries = [];
  const client = { from: vi.fn(() => {
    const query = {};
    for (const method of ['select', 'is', 'order']) query[method] = vi.fn(() => query);
    query.limit = vi.fn().mockResolvedValue({ data: [{ id: queries.length ? 'latest' : 'first' }], error: null });
    queries.push(query);
    return query;
  }) };
  expect(await createProgressService(client).load()).toEqual({ baseline: { id: 'first' }, latest: { id: 'latest' } });
  expect(queries).toHaveLength(2);
  for (const query of queries) {
    expect(query.is).toHaveBeenCalledWith('scenario_key', null);
    expect(query.limit).toHaveBeenCalledWith(1);
  }
  expect(queries[0].order).toHaveBeenCalledWith('created_at', { ascending: true });
  expect(queries[1].order).toHaveBeenCalledWith('created_at', { ascending: false });
});

test('pantry batch additions validate all rows before a single owner-scoped insert',async()=>{
  const insert=vi.fn(()=>({select:vi.fn().mockResolvedValue({data:[{id:'a'},{id:'b'}],error:null})}));
  const client={from:vi.fn(()=>({insert}))};const service=createPantryService(client,'owner-a');
  const item={name:'Rice',quantity:'1',unit:'bag',location:'Pantry',date_type:'Not recorded',food_date:'',is_leftover:false};
  await service.saveMany([{...item,catalogId:'rice'},{...item,name:'Pasta'}]);
  expect(insert).toHaveBeenCalledTimes(1);expect(insert.mock.calls[0][0]).toHaveLength(2);
  expect(insert.mock.calls[0][0].every(row=>row.owner_id==='owner-a')).toBe(true);
  expect(insert.mock.calls[0][0][0]).not.toHaveProperty('catalogId');
  await expect(service.saveMany([item,{...item,quantity:0}])).rejects.toThrow();
  expect(insert).toHaveBeenCalledTimes(1);
  await expect(service.saveMany([])).rejects.toThrow();
});
