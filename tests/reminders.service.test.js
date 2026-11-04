import { expect, test, vi } from 'vitest';
import { defaultReminders, dueReminders, reminderCalendar, validateReminder, weeklySchedule } from '../src/domain/reminders.js';
import { createReminderService } from '../src/services/reminders.js';

const reminder = (patch = {}) => ({ ...defaultReminders()[0], enabled: true, weekday: 1, time_of_day: '09:00', starts_at: '2026-10-30T00:00:00Z', last_acknowledged_at: null, ...patch });
test('reminders are opt-in and validate day, task, time and timezone', () => {
  expect(defaultReminders().every(({ enabled }) => !enabled)).toBe(true);
  for (const patch of [{ task_key: 'fake' }, { weekday: 7 }, { weekday: '1' }, { time_of_day: '24:00' }, { time_of_day: '09:99' }, { time_zone: 'UTC' }, { enabled: 'true' }]) expect(() => validateReminder(reminder(patch))).toThrow();
});
test('weekly reminder fires at selected NZ time, catches up and stays dismissed until next week', () => {
  const before = new Date('2026-11-01T19:59:59Z'); // Monday 08:59:59 NZDT
  const at = new Date('2026-11-01T20:00:00Z');
  expect(weeklySchedule(reminder(), before).due).toBe(false);
  expect(weeklySchedule(reminder(), at).due).toBe(true);
  expect(dueReminders([reminder()], new Date('2026-11-04T01:00:00Z'))).toHaveLength(1);
  const acknowledged = reminder({ last_acknowledged_at: '2026-11-01T20:01:00Z' });
  expect(weeklySchedule(acknowledged, new Date('2026-11-04T01:00:00Z')).due).toBe(false);
  expect(weeklySchedule(acknowledged, new Date('2026-11-08T20:00:00Z')).due).toBe(true);
  expect(weeklySchedule(reminder({ enabled: false }), at).due).toBe(false);
  expect(weeklySchedule(reminder({ starts_at: '2026-11-01T20:01:00Z' }), at).due).toBe(false);
});
test('weekly local time handles NZ daylight-saving transitions and midnight', () => {
  const spring = reminder({ weekday: 0, time_of_day: '02:30' });
  expect(weeklySchedule(spring, new Date('2026-09-26T13:00:00Z')).next.toISOString()).toBe('2026-09-26T14:30:00.000Z'); // 03:30 NZDT
  expect(weeklySchedule(spring, new Date('2026-09-27T01:00:00Z')).next.toISOString()).toBe('2026-10-03T13:30:00.000Z'); // next week 02:30
  expect(weeklySchedule(spring, new Date('2026-04-04T13:45:00Z')).last.toISOString()).toBe('2026-04-04T13:30:00.000Z'); // first 02:30
  expect(weeklySchedule(reminder({ time_of_day: '00:00' }), new Date('2026-11-01T11:00:00Z')).last.toISOString()).toBe('2026-11-01T11:00:00.000Z');
});
test('calendar contains only enabled tasks, weekly recurrence, NZ timezone and display alarms', () => {
  const content = reminderCalendar([reminder(), reminder({ task_key: 'shopping', enabled: false })], new Date('2026-11-01T00:00:00Z'), () => 'test-id');
  expect(content).toContain('DTSTART;TZID=Pacific/Auckland:20261102T090000');
  expect(content).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
  expect(content).toContain('BEGIN:VTIMEZONE');
  expect(content).toContain('ACTION:DISPLAY\r\nTRIGGER:PT0S');
  expect(content.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  expect(content).not.toContain('Prepare for shopping');
  expect(content.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
  expect(() => reminderCalendar(defaultReminders())).toThrow();
});
test('reminder service scopes preferences, saves atomically and rejects unconfirmed dismissals', async () => {
  const query = {};
  for (const key of ['select','eq','update','upsert']) query[key] = vi.fn(() => query);
  query.then = (resolve) => resolve({ data: defaultReminders(), error: null });
  query.single = vi.fn().mockResolvedValue({ data: reminder(), error: null });
  const client = { from: vi.fn(() => query) };
  const service = createReminderService(client, 'account-a');
  await service.list();
  expect(query.eq).toHaveBeenCalledWith('owner_id', 'account-a');
  const now = new Date('2026-11-01T00:00:00Z');
  await service.save(defaultReminders(), now);
  expect(query.upsert).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ owner_id: 'account-a', starts_at: now.toISOString() })]), { onConflict: 'owner_id,task_key' });
  await service.acknowledge('meal-planning', now);
  expect(query.eq).toHaveBeenCalledWith('task_key', 'meal-planning');
  query.single.mockResolvedValue({ data: null, error: null });
  await expect(service.acknowledge('shopping')).rejects.toThrow();
  await expect(service.save([reminder()])).rejects.toThrow();
  await expect(createReminderService(client, null).list()).rejects.toThrow('Sign in');
});
