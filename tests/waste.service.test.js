import { expect, test } from 'vitest';
import { compareWaste, kilograms, periodSummary, validateDiscard, weekStart } from '../src/domain/waste.js';
import { WASTE_SCENARIOS } from '../src/data/wasteScenarios.js';

test('SI mass conversion excludes volumes, portions, missing values and invalid quantities', () => {
  expect(kilograms(500,'g')).toBe(.5);expect(kilograms(2,' KG ')).toBe(2);expect(kilograms(250000,'mg')).toBe(.25);
  for(const [q,u] of [[1,'L'],[1,'items'],[1,'portions'],['','g'],[null,'kg'],[-1,'g'],[NaN,'g'],[1,null]])expect(kilograms(q,u)).toBeNull();
});
test('calendar dates group by Monday independently of DST and year boundaries', () => {
  expect(weekStart('2026-11-08')).toBe('2026-11-02');expect(weekStart('2026-09-27')).toBe('2026-09-21');expect(weekStart('2027-01-01')).toBe('2026-12-28');
  expect(()=>weekStart('2026-02-30')).toThrow();
});
test.each(WASTE_SCENARIOS)('$id fictional dataset has expected recorded change', s => {
  const baseline=periodSummary(s.events,s.baseline),latest=periodSummary(s.events,s.comparison);
  expect(compareWaste(baseline,latest,'2026-11-07').percent).toBe((s.amount-1000)/10);
});
test('missing logs, mixed measurement and consumed food are not zero/avoided waste', () => {
  const rows=[{event_date:'2026-10-06',quantity:500,unit:'g',outcome:'Discarded',category:'Fruit',reason:'Forgotten food'}, {event_date:'2026-10-07',quantity:1,unit:'items',outcome:'Discarded'}, {event_date:'2026-10-06',quantity:20,unit:'kg',outcome:'Used'}, {event_date:null,quantity:10,unit:'kg',outcome:'Discarded'}];
  const week=periodSummary(rows,'2026-10-05');expect(week.kg).toBe(.5);expect(week.count).toBe(2);expect(week.unmeasured).toBe(1);expect(week.categories.Fruit.kg).toBe(.5);
  expect(periodSummary(rows,'2026-10-12').kg).toBeNull();
  expect(compareWaste(week,periodSummary(rows,'2026-10-12'),'2026-11-07').percent).toBeNull();
});
test('comparison handles zero, overlapping, incomplete and unmeasured baselines safely', () => {
  const s=WASTE_SCENARIOS[0],b=periodSummary(s.events,s.baseline),c=periodSummary(s.events,s.comparison);
  expect(compareWaste({...b,kg:0},c,'2026-11-07').percent).toBeNull();
  expect(compareWaste(b,b,'2026-11-07').percent).toBeNull();
  expect(compareWaste(b,c,'2026-10-15').percent).toBeNull();
  expect(compareWaste({...b,unmeasured:1},c,'2026-11-07').percent).toBeNull();
});
test('validation rejects missing amounts, impossible/future dates and missing reasons', () => {
  const row={event_date:'2026-11-06',food_name:'Example apple',category:'Fruit',quantity:'0.125',unit:'kg',reason:'Forgotten food',notes:''};
  expect(validateDiscard(row,'2026-11-07').quantity).toBe(.125);
  for(const patch of [{quantity:''},{quantity:'NaN'},{quantity:'1.0001'},{event_date:'2026-02-30'},{event_date:'2026-11-08'},{reason:''},{food_name:''},{category:null},{unit:''}])expect(()=>validateDiscard({...row,...patch},'2026-11-07')).toThrow();
});
