import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { personalise, INDICATORS } from '../src/domain/personalisation.js';
import { SCENARIOS } from '../src/data/scenarios.js';

test('integrated tools: atomic consumption, idempotent purchases, outcomes, isolation and sharing eligibility',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
   insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`);
  for(const file of ['20261103092654_pantry_inventory.sql','20261103103652_shopping_items.sql','20261103104230_meal_plans.sql','20261104214337_complete_household_tools.sql','20261104232140_integrated_food_workflows.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
  await db.exec(`set role authenticated;set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`);
  const food=(await db.query(`insert into public.pantry_items(name,quantity,unit,location,date_type,food_date) values('Rice',4,'bags','Pantry','Best before','2099-01-01') returning id`)).rows[0].id;
  const expired=(await db.query(`insert into public.pantry_items(name,quantity,unit,location,date_type,food_date) values('Old milk',1,'bottle','Fridge','Use by','2000-01-01') returning id`)).rows[0].id;
  const meal=(await db.query(`insert into public.meal_plans(name,meal_date,meal_slot,portions) values('Rice bowl','2099-01-01','Dinner',2) returning id`)).rows[0].id;
  const consume=items=>db.query('select public.confirm_meal_consumption($1,$2::jsonb)',[meal,JSON.stringify(items)]);
  await assert.rejects(consume([{id:food,quantity:1},{id:expired,quantity:1}]));
  assert.equal(Number((await db.query('select quantity from public.pantry_items where id=$1',[food])).rows[0].quantity),4);
  assert.equal((await db.query('select count(*)::int n from public.inventory_events')).rows[0].n,0);
  await assert.rejects(consume([{id:food,quantity:1},{id:food,quantity:1}]));
  await assert.rejects(consume([{id:food,quantity:5}]));
  await consume([{id:food,quantity:1.25}]);
  assert.equal(Number((await db.query('select quantity from public.pantry_items where id=$1',[food])).rows[0].quantity),2.75);
  await assert.rejects(consume([{id:food,quantity:1}]));
  await assert.rejects(db.query(`select public.record_food_outcome($1,1,'Discarded','')`,[expired]));
  await db.query(`select public.record_food_outcome($1,1,'Discarded','Past use-by')`,[expired]);
  assert.equal((await db.query('select leftover_status,disposal_reason from public.pantry_items where id=$1',[expired])).rows[0].disposal_reason,'Past use-by');
  const shopping=(await db.query(`insert into public.shopping_items(name,quantity,unit,purchased,category,cost_nzd) values('Apples',3,'items',false,'Fruit',4.50) returning id`)).rows[0].id;
  const transfer=()=>db.query(`select public.transfer_shopping_to_pantry($1,$2::jsonb) id`,[shopping,JSON.stringify({name:'Apples',quantity:3,unit:'items',location:'Fridge',date_type:'Not recorded',food_date:null,category:'Fruit',purchase_date:'2099-01-01'})]);
  await assert.rejects(transfer());await db.query('update public.shopping_items set purchased=true where id=$1',[shopping]);
  const transferred=(await transfer()).rows[0].id;assert.equal((await transfer()).rows[0].id,transferred);
  assert.equal((await db.query(`select count(*)::int n from public.pantry_items where name='Apples'`)).rows[0].n,1);
  await db.query('delete from public.pantry_items where id=$1',[transferred]);
  assert.equal((await transfer()).rows[0].id,null);
  assert.equal((await db.query(`select count(*)::int n from public.pantry_items where name='Apples'`)).rows[0].n,0);
  await db.query(`insert into public.sharing_offers(name,quantity,unit,area,donor,best_before,pantry_item_id) values('Surplus rice',1,'bags','Auckland','Demo household A','2099-01-01',$1)`,[food]);
  await assert.rejects(db.query(`insert into public.sharing_offers(name,quantity,unit,area,donor,best_before,pantry_item_id) values('Old milk',1,'bottle','Auckland','Demo household A','2099-01-01',$1)`,[expired]));
  await db.exec(`set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';`);
  assert.equal((await db.query('select * from public.inventory_events')).rows.length,0);
  await assert.rejects(db.query(`select public.record_food_outcome($1,1,'Used','')`,[food]));await assert.rejects(transfer());
  await assert.rejects(db.query(`insert into public.sharing_offers(name,quantity,unit,area,donor,best_before,pantry_item_id) values('Foreign rice',1,'bags','Auckland','Demo household B','2099-01-01',$1)`,[food]));
  await db.exec(`set role anon;set request.jwt.claim.sub='';`);await assert.rejects(db.exec('select * from public.inventory_events'));
  await assert.rejects(db.query(`select public.record_food_outcome($1,1,'Used','')`,[food]));
 }finally{await db.close();}
});

test('migration: SQL parity, ownership isolation, validation and atomic writes', async () => {
  const db = new PGlite();
  try {
    // Minimal Supabase Auth stand-in. Hosted Auth itself still needs live testing.
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
      grant usage on schema auth to authenticated, anon;
      grant execute on function auth.uid(), auth.jwt() to authenticated, anon;
      insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');`);
    await db.exec(await readFile(new URL('../supabase/migrations/202610310001_fictional_assessments.sql', import.meta.url), 'utf8'));
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';`);
    const keys = ['overbuying','forgetting_food','poor_meal_planning','discarding_leftovers','storage_uncertainty'];
    async function save(scores, scenario = null) {
      return db.query('select public.save_fictional_assessment($1::jsonb,$2::text) as id', [JSON.stringify(scores), scenario]);
    }
    for (let n = 0; n < 243; n++) {
      const values = keys.map((_, index) => Math.floor(n / 3 ** index) % 3);
      const sqlScores = Object.fromEntries(keys.map((key, index) => [key, values[index]]));
      const jsScores = Object.fromEntries(INDICATORS.map(({ id }, index) => [id, values[index]]));
      const saved = await save(sqlScores);
      const { rows } = await db.query('select profiles, explanations, recommendations from public.assessment_results where assessment_id = $1', [saved.rows[0].id]);
      const expected = personalise(jsScores);
      assert.deepEqual(rows[0], { profiles: expected.profiles, explanations: expected.explanations, recommendations: expected.recommendations });
    }
    for (const scenario of SCENARIOS) {
      await save(Object.fromEntries(keys.map((key, index) => [key, scenario.scores[INDICATORS[index].id]])), scenario.id);
    }
    const valid = Object.fromEntries(keys.map((key) => [key, 0]));
    for (const invalid of [{}, { ...valid, overbuying: 3 }, { ...valid, overbuying: '2' }, { ...valid, extra: 0 }]) {
      await assert.rejects(save(invalid));
    }
    await assert.rejects(save(valid, 'all-profiles'));
    await assert.rejects(db.exec('insert into public.households default values'));
    const count = await db.query('select count(*)::int as n from public.households');
    assert.equal(count.rows[0].n, 251);
    // Force the final insert to fail after household and assessment inserts.
    await db.exec(`reset role;
      create function public.test_reject_result() returns trigger language plpgsql as
        $$ begin raise exception 'simulated final insert failure'; end; $$;
      create trigger test_result_failure before insert on public.assessment_results
        for each row execute function public.test_reject_result();
      set role authenticated;`);
    await assert.rejects(save(valid), /simulated final insert failure/);
    await db.exec(`reset role;
      drop trigger test_result_failure on public.assessment_results;
      drop function public.test_reject_result();
      set role authenticated;`);
    await db.exec(`set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';`);
    for (const table of ['households','assessments','assessment_results']) {
      assert.equal((await db.query(`select count(*)::int as n from public.${table}`)).rows[0].n, 0);
    }
    await db.exec(`set role anon; set request.jwt.claim.sub = '';`);
    await assert.rejects(save(valid));
    await assert.rejects(db.exec('select * from public.assessments'));
    await db.exec(`reset role;`);
    for (const table of ['households','assessments','assessment_results']) {
      assert.equal((await db.query(`select count(*)::int as n from public.${table}`)).rows[0].n, 251);
    }
  } finally { await db.close(); }
});

test('pantry migration: authenticated CRUD, constraints and account isolation', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261103092654_pantry_inventory.sql', import.meta.url), 'utf8'));
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';`);
    const inserted = await db.query(`insert into public.pantry_items(name,quantity,unit,location) values ('Carrots',500,'g','Fridge') returning id`);
    const id = inserted.rows[0].id;
    await db.query(`update public.pantry_items set quantity=250,use_first=true,notes='Check packaging' where id=$1`, [id]);
    assert.equal((await db.query('select quantity::float as quantity from public.pantry_items')).rows[0].quantity, 250);
    for (const change of ["quantity=0", "quantity=-1", "name=' '", "date_type='Use by'", "location='Unknown'", "is_fictional=false", "owner_id='22222222-2222-4222-8222-222222222222'"]) {
      await assert.rejects(db.exec(`update public.pantry_items set ${change}`));
    }
    await db.exec(`set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';`);
    assert.equal((await db.query('select * from public.pantry_items')).rows.length, 0);
    assert.equal((await db.query('update public.pantry_items set name=$1 where id=$2 returning id', ['Stolen', id])).rows.length, 0);
    assert.equal((await db.query('delete from public.pantry_items where id=$1 returning id', [id])).rows.length, 0);
    await assert.rejects(db.exec(`insert into public.pantry_items(owner_id,name,quantity,unit,location) values ('11111111-1111-4111-8111-111111111111','Carrots',1,'bag','Fridge')`));
    await db.exec(`set role anon; set request.jwt.claim.sub='';`);
    await assert.rejects(db.exec('select * from public.pantry_items'));
    await assert.rejects(db.exec(`insert into public.pantry_items(name,quantity,unit,location) values ('Carrots',1,'bag','Fridge')`));
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';`);
    assert.equal((await db.query('delete from public.pantry_items where id=$1 returning id', [id])).rows.length, 1);
  } finally { await db.close(); }
});

test('reminder preferences: opt-in upsert, validation and owner isolation', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261103093941_reminder_preferences.sql', import.meta.url), 'utf8'));
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';`);
    await db.exec(`insert into public.reminder_preferences(task_key,weekday,time_of_day) values ('shopping',1,'09:00');`);
    assert.equal((await db.query('select enabled from public.reminder_preferences')).rows[0].enabled, false);
    await db.exec(`insert into public.reminder_preferences(task_key,weekday,time_of_day,enabled) values ('shopping',2,'10:30',true) on conflict (owner_id,task_key) do update set weekday=excluded.weekday,time_of_day=excluded.time_of_day,enabled=excluded.enabled;`);
    assert.deepEqual((await db.query('select weekday,time_of_day,enabled from public.reminder_preferences')).rows[0], { weekday: 2, time_of_day: '10:30', enabled: true });
    for (const patch of ["weekday=7", "time_of_day='24:00'", "task_key='unknown'", "time_zone='UTC'", "is_fictional=false", "owner_id='22222222-2222-4222-8222-222222222222'"]) await assert.rejects(db.exec(`update public.reminder_preferences set ${patch}`));
    await db.exec(`update public.reminder_preferences set last_acknowledged_at=now(); set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';`);
    assert.equal((await db.query('select * from public.reminder_preferences')).rows.length, 0);
    assert.equal((await db.query(`update public.reminder_preferences set enabled=false returning task_key`)).rows.length, 0);
    assert.equal((await db.query(`delete from public.reminder_preferences returning task_key`)).rows.length, 0);
    await assert.rejects(db.exec(`insert into public.reminder_preferences(owner_id,task_key,weekday,time_of_day) values ('11111111-1111-4111-8111-111111111111','pantry',1,'09:00')`));
    await db.exec(`set role anon; set request.jwt.claim.sub='';`);
    await assert.rejects(db.exec('select * from public.reminder_preferences'));
    await assert.rejects(db.exec(`insert into public.reminder_preferences(task_key,weekday,time_of_day) values ('shopping',1,'09:00')`));
  } finally { await db.close(); }
});

test('shopping migration: CRUD, purchase status, validation and owner isolation', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261103103652_shopping_items.sql', import.meta.url), 'utf8'));
    await db.exec(`set role authenticated; set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`);
    const { rows } = await db.query(`insert into public.shopping_items(name,quantity,unit) values ('Apples',4,'items') returning id,purchased`);
    assert.equal(rows[0].purchased, false);
    await db.query(`update public.shopping_items set purchased=true,quantity=2 where id=$1`, [rows[0].id]);
    assert.equal((await db.query('select purchased from public.shopping_items')).rows[0].purchased, true);
    for (const patch of ["quantity=0", "quantity=-1", "name=' '", "unit=' '", "is_fictional=false", "owner_id='22222222-2222-4222-8222-222222222222'"]) await assert.rejects(db.exec(`update public.shopping_items set ${patch}`));
    await db.exec(`set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';`);
    assert.equal((await db.query('select * from public.shopping_items')).rows.length, 0);
    assert.equal((await db.query('update public.shopping_items set purchased=false returning id')).rows.length, 0);
    assert.equal((await db.query('delete from public.shopping_items returning id')).rows.length, 0);
    await assert.rejects(db.exec(`insert into public.shopping_items(owner_id,name,quantity,unit) values ('11111111-1111-4111-8111-111111111111','Rice',1,'bag')`));
    await db.exec(`set role anon; set request.jwt.claim.sub='';`);
    await assert.rejects(db.exec('select * from public.shopping_items'));
    await assert.rejects(db.exec(`insert into public.shopping_items(name,quantity,unit) values ('Rice',1,'bag')`));
    await db.exec(`set role authenticated; set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`);
    assert.equal((await db.query('delete from public.shopping_items where id=$1 returning id', [rows[0].id])).rows.length, 1);
  } finally { await db.close(); }
});

test('meal migration: dated CRUD, constraints and owner isolation', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261103104230_meal_plans.sql', import.meta.url), 'utf8'));
    await db.exec(`set role authenticated; set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`);
    const { rows } = await db.query(`insert into public.meal_plans(name,meal_date,meal_slot,portions,ingredients) values ('Soup dinner','2026-11-03','Dinner',2,'Lentil soup') returning id`);
    await db.query(`update public.meal_plans set portions=3,includes_leftovers=true where id=$1`, [rows[0].id]);
    assert.deepEqual((await db.query('select portions,includes_leftovers from public.meal_plans')).rows[0], { portions: 3, includes_leftovers: true });
    for (const patch of ["portions=0", "portions=51", "name=' '", "meal_slot='Invalid'", "meal_date='2026-02-30'", "meal_date='1999-01-01'", "ingredients=repeat('x',2001)", "is_fictional=false", "owner_id='22222222-2222-4222-8222-222222222222'"]) await assert.rejects(db.exec(`update public.meal_plans set ${patch}`));
    await db.exec(`set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';`);
    assert.equal((await db.query('select * from public.meal_plans')).rows.length, 0);
    assert.equal((await db.query('update public.meal_plans set portions=4 returning id')).rows.length, 0);
    assert.equal((await db.query('delete from public.meal_plans returning id')).rows.length, 0);
    await assert.rejects(db.exec(`insert into public.meal_plans(owner_id,name,meal_date,meal_slot,portions) values ('11111111-1111-4111-8111-111111111111','Rice','2026-11-04','Dinner',2)`));
    await db.exec(`set role anon; set request.jwt.claim.sub='';`);
    await assert.rejects(db.exec('select * from public.meal_plans'));
    await assert.rejects(db.exec(`insert into public.meal_plans(name,meal_date,meal_slot,portions) values ('Rice','2026-11-04','Dinner',2)`));
    await db.exec(`set role authenticated; set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`);
    assert.equal((await db.query('delete from public.meal_plans where id=$1 returning id', [rows[0].id])).rows.length, 1);
  } finally { await db.close(); }
});

test('completion migration: legacy pantry preservation, leftover constraints and private sharing simulation', async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
      insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261103092654_pantry_inventory.sql',import.meta.url),'utf8'));
    await db.exec(`insert into public.pantry_items(owner_id,name,quantity,unit,location) values ('11111111-1111-4111-8111-111111111111','Legacy rice',1,'bag','Pantry');`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261104214337_complete_household_tools.sql',import.meta.url),'utf8'));
    await db.exec(`set role authenticated;set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`);
    assert.deepEqual((await db.query(`select category,leftover_status from public.pantry_items`)).rows[0],{category:'Other',leftover_status:'Available'});
    await assert.rejects(db.exec(`update public.pantry_items set leftover_status='Used'`));
    await db.exec(`update public.pantry_items set is_leftover=true,planned_use_date='2099-11-05',category='Prepared meals';`);
    await assert.rejects(db.exec(`update public.pantry_items set leftover_status='Frozen'`));
    await db.exec(`update public.pantry_items set leftover_status='Frozen',location='Freezer';update public.pantry_items set leftover_status='Used';`);
    assert.equal((await db.query(`select count(*)::int as n from public.pantry_items where leftover_status in ('Available','Frozen')`)).rows[0].n,0);
    const {rows}=await db.query(`insert into public.sharing_offers(name,quantity,unit,area,donor,best_before) values ('Demo rice',1,'bag','Auckland','Demo household A','2099-11-05') returning id`);
    const id=rows[0].id;
    await assert.rejects(db.exec(`update public.sharing_offers set is_simulation=false`));
    await assert.rejects(db.exec(`update public.sharing_offers set status='Reserved'`));
    await assert.rejects(db.exec(`update public.sharing_offers set status='Reserved',recipient=donor`));
    await db.exec(`update public.sharing_offers set status='Reserved',recipient='Demo household B';`);
    await db.exec(`set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';`);
    assert.equal((await db.query('select * from public.sharing_offers')).rows.length,0);
    assert.equal((await db.query(`update public.sharing_offers set status='Collected' returning id`)).rows.length,0);
    assert.equal((await db.query('delete from public.sharing_offers returning id')).rows.length,0);
    await assert.rejects(db.exec(`insert into public.sharing_offers(owner_id,name,quantity,unit,area,donor,best_before) values ('11111111-1111-4111-8111-111111111111','Rice',1,'bag','Auckland','Demo household A','2099-11-05')`));
    await db.exec(`set role anon;set request.jwt.claim.sub='';`);await assert.rejects(db.exec('select * from public.sharing_offers'));
    await db.exec(`set role authenticated;set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`);
    assert.equal((await db.query('delete from public.sharing_offers where id=$1 returning id',[id])).rows.length,1);
  }finally{await db.close();}
});
