import { test, expect, vi } from 'vitest';
import { createAssessmentService } from '../src/services/assessments.js';
import { SCENARIOS } from '../src/data/scenarios.js';
import { createConfiguredClient } from '../src/services/supabase.js';

test('missing environment keeps storage optional', async () => {
  expect(createConfiguredClient({})).toBeNull();
  await expect(createAssessmentService(null).save(SCENARIOS[0].scores)).rejects.toThrow('not configured');
});
test('maps domain answers and saves in one transactional RPC', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: 'assessment-id', error: null });
  const service = createAssessmentService({ rpc });
  await expect(service.save(SCENARIOS[6].scores, 'multiple-profiles')).resolves.toBe('assessment-id');
  expect(rpc).toHaveBeenCalledExactlyOnceWith('save_fictional_assessment', {
    p_scores: { overbuying: 2, forgetting_food: 2, poor_meal_planning: 0, discarding_leftovers: 1, storage_uncertainty: 2 },
    p_scenario_key: 'multiple-profiles',
  });
});
test('invalid inputs and mismatched scenarios never make network requests', async () => {
  const rpc = vi.fn();
  const service = createAssessmentService({ rpc });
  await expect(service.save({})).rejects.toThrow();
  await expect(service.save(SCENARIOS[0].scores, 'all-profiles')).rejects.toThrow('Scenario');
  await expect(service.save(SCENARIOS[0].scores, 'unknown')).rejects.toThrow('Scenario');
  expect(rpc).not.toHaveBeenCalled();
});
test('save failure is surfaced for retry without changing scores', async () => {
  const failure = { message: 'database unavailable' };
  const service = createAssessmentService({ rpc: vi.fn().mockResolvedValue({ data: null, error: failure }) });
  const input = { ...SCENARIOS[0].scores };
  await expect(service.save(input)).rejects.toMatchObject({ cause: failure });
  expect(input).toEqual(SCENARIOS[0].scores);
});
test('lists bounded recent records and propagates failures', async () => {
  const limit = vi.fn().mockResolvedValue({ data: [{ id: 'saved-id' }], error: null });
  const order = vi.fn().mockReturnValue({ limit });
  const select = vi.fn().mockReturnValue({ order });
  const from = vi.fn().mockReturnValue({ select });
  const service = createAssessmentService({ from });
  await expect(service.list()).resolves.toEqual([{ id: 'saved-id' }]);
  expect(from).toHaveBeenCalledWith('assessments');
  expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
  expect(limit).toHaveBeenCalledWith(50);
  limit.mockResolvedValue({ data: null, error: { message: 'denied' } });
  await expect(service.list()).rejects.toThrow('Could not load');
});
