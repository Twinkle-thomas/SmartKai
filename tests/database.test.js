import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { personalise, INDICATORS } from '../src/domain/personalisation.js';
import { SCENARIOS } from '../src/data/scenarios.js';

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
