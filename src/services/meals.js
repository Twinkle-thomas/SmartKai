import { validateMeal, weekDates } from '../domain/meals.js';
export function createMealService(client, userId) {
  function table() {
    if (!client || !userId) throw new Error('Sign in to manage meal plans.');
    return client.from('meal_plans');
  }
  async function confirmed(query) {
    const { data, error } = await query.select('id').single();
    if (error || !data) throw error ?? new Error('Meal change could not be confirmed.');
    return data;
  }
  return {
    async list(date) {
      const days = weekDates(date);
      const { data, error } = await table().select('*').eq('owner_id', userId).gte('meal_date', days[0]).lte('meal_date', days[6]).order('meal_date', { ascending: true }).order('created_at', { ascending: true }).limit(100);
      if (error) throw error;
      return data;
    },
    save(item, id = null) {
      const values = validateMeal(item);
      return confirmed(id ? table().update(values).eq('owner_id', userId).eq('id', id) : table().insert({ ...values, owner_id: userId }));
    },
    remove(id) { return confirmed(table().delete().eq('owner_id', userId).eq('id', id)); },
  };
}
