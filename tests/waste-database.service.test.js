import { test, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
test('waste migration: legacy preservation, partial/whole discards, retry deduplication, isolation and persistent reads', async () => {
 const db=new PGlite();
 try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
   insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`);
  const migrations=['20261103092654_pantry_inventory.sql','20261103103652_shopping_items.sql','20261103104230_meal_plans.sql','20261104214337_complete_household_tools.sql','20261104232140_integrated_food_workflows.sql'];
  for(const file of migrations)await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
  await db.exec(`set role authenticated;set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`);
  const food=(await db.query(`insert into pantry_items(name,quantity,unit,location,date_type,category,is_leftover) values('QA soup',2,'kg','Fridge','Not recorded','Prepared meals',true) returning id`)).rows[0].id;
  await db.query(`insert into pantry_items(name,quantity,unit,location,date_type) values('Unrelated stock',3,'items','Pantry','Not recorded')`);
  await db.query(`select record_food_outcome($1,.25,'Discarded','Old reason')`,[food]);
  const legacy=(await db.query('select id from inventory_events')).rows[0].id;
  await db.exec('reset role');await db.exec(await readFile('supabase/migrations/20261106111311_food_waste_tracking.sql','utf8'));
  await db.exec(`set role authenticated;set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`);
  const history=(await db.query('select *,event_date::text as event_date from inventory_events where id=$1',[legacy])).rows[0];expect(history.legacy_metadata).toBe(true);expect(history.category).toBe('Other');expect(history.event_date).toBeTruthy();
  const record=(op,quantity=.5,linked=food,unit='kg',reason='Prepared too much')=>db.query(`select record_waste_discard($1,$2,'2026-10-06',$3,$4,$5,$6,$7,'QA notes') id`,[op,linked,linked?'QA soup':'QA standalone',linked?'Prepared meals':'Other',quantity,unit,reason]);
  const op='33333333-3333-4333-8333-333333333333';const first=(await record(op)).rows[0].id;
  expect((await record(op)).rows[0].id).toBe(first);
  await expect(record(op,.6)).rejects.toThrow();
  expect(Number((await db.query('select quantity from pantry_items where id=$1',[food])).rows[0].quantity)).toBe(1.25);
  expect(Number((await db.query("select quantity from pantry_items where name='Unrelated stock'")).rows[0].quantity)).toBe(3);
  expect((await db.query('select count(*)::int n from inventory_events')).rows[0].n).toBe(2);
  const event=(await db.query('select *,event_date::text as event_date from inventory_events where id=$1',[first])).rows[0];expect(event.category).toBe('Prepared meals');expect(event.notes).toBe('QA notes');expect(event.event_date).toBe('2026-10-06');
  await expect(record('44444444-4444-4444-8444-444444444444',2)).rejects.toThrow();
  await expect(record('44444444-4444-4444-8444-444444444444',.5,food,'g')).rejects.toThrow();
  await expect(record('44444444-4444-4444-8444-444444444444',.5,food,'kg','')).rejects.toThrow();
  await record('44444444-4444-4444-8444-444444444444',1.25);
  expect((await db.query('select leftover_status from pantry_items where id=$1',[food])).rows[0].leftover_status).toBe('Discarded');
  await record('55555555-5555-4555-8555-555555555555',1,null,'items');
  await db.query(`insert into waste_baselines(owner_id,start_date) values(auth.uid(),'2026-10-05')`);
  await db.exec(`set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222'`);
  expect((await db.query('select * from inventory_events')).rows).toHaveLength(0);expect((await db.query('select * from waste_baselines')).rows).toHaveLength(0);
  await expect(record('66666666-6666-4666-8666-666666666666')).rejects.toThrow();
  await expect(db.query(`insert into waste_baselines values('11111111-1111-4111-8111-111111111111','2026-10-05')`)).rejects.toThrow();
  await db.exec(`set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'`);
  expect((await db.query('select * from inventory_events')).rows).toHaveLength(4);
  expect((await db.query('select start_date::text from waste_baselines')).rows[0].start_date).toBe('2026-10-05');
  // Inventory deletion must not erase the historical event snapshot.
  await db.query('delete from pantry_items where id=$1',[food]);expect((await db.query('select food_name from inventory_events where id=$1',[first])).rows[0].food_name).toBe('QA soup');
  await expect(db.query('update inventory_events set quantity=20 where id=$1',[first])).rejects.toThrow();
  const restored = new PGlite({loadDataDir:await db.dumpDataDir()});
  try {
    await restored.exec(`set role authenticated;set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'`);
    expect((await restored.query('select * from inventory_events')).rows).toHaveLength(4);
    expect((await restored.query('select start_date::text from waste_baselines')).rows[0].start_date).toBe('2026-10-05');
  } finally {await restored.close();}
  await db.exec(`set role anon;set request.jwt.claim.sub=''`);await expect(db.query('select * from waste_baselines')).rejects.toThrow();await expect(record(op)).rejects.toThrow();
 } finally {await db.close();}
},30000);
