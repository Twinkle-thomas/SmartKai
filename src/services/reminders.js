import { REMINDER_TASKS, validateReminder } from '../domain/reminders.js';

export function createReminderService(client, userId) {
  function table() {
    if (!client || !userId) throw new Error('Sign in to manage reminders.');
    return client.from('reminder_preferences');
  }
  return {
    async list() {
      const { data, error } = await table().select('*').eq('owner_id', userId);
      if (error) throw error;
      return data;
    },
    async save(records, now = new Date()) {
      if (records.length !== REMINDER_TASKS.length || new Set(records.map(({ task_key }) => task_key)).size !== REMINDER_TASKS.length) throw new Error('Provide one preference for each task.');
      const values = records.map((record) => ({ ...validateReminder(record), owner_id: userId, starts_at: now.toISOString(), last_acknowledged_at: null }));
      const { data, error } = await table().upsert(values, { onConflict: 'owner_id,task_key' }).select('*');
      if (error || data?.length !== records.length) throw error ?? new Error('Reminder changes could not be confirmed.');
      return data;
    },
    async acknowledge(taskKey, now = new Date()) {
      const { data, error } = await table().update({ last_acknowledged_at: now.toISOString() }).eq('owner_id', userId).eq('task_key', taskKey).select('*').single();
      if (error || !data) throw error ?? new Error('Reminder dismissal could not be confirmed.');
      return data;
    },
  };
}
