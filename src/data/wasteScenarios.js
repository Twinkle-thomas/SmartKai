export const WASTE_SCENARIOS = [
  { id: 'decreased', label: 'Simulated: decreased recorded waste', amount: 500 },
  { id: 'increased', label: 'Simulated: increased recorded waste', amount: 1500 },
  { id: 'unchanged', label: 'Simulated: unchanged recorded waste', amount: 1000 },
].map(s => ({ ...s, baseline: '2026-10-05', comparison: '2026-10-12', events: [
  { id: `${s.id}-a`, event_date: '2026-10-06', food_name: 'Example carrots', category: 'Vegetables', quantity: 1000, unit: 'g', reason: 'Bought too much', notes: 'Simulated evaluation record', outcome: 'Discarded' },
  { id: `${s.id}-b`, event_date: '2026-10-13', food_name: 'Example soup', category: 'Prepared meals', quantity: s.amount, unit: 'g', reason: 'Prepared too much', notes: 'Simulated evaluation record', outcome: 'Discarded' },
] }));
