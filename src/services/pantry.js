import { validateFood } from '../domain/pantry.js';

export function createPantryService(client, userId) {
  const table = () => {
    if (!client || !userId) throw new Error('Sign in to manage your pantry.');
    return client.from('pantry_items');
  };
  return {
    async list({ includeArchived = false } = {}) {
      let query = table().select('*').eq('owner_id', userId);
      if (!includeArchived) query = query.in('leftover_status', ['Available','Frozen']);
      const { data, error } = await query.order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
    async save(item, id = null) {
      const values = validateFood(item);
      const query = id ? table().update(values).eq('owner_id', userId).eq('id', id) : table().insert({ ...values, owner_id: userId });
      const { data, error } = await query.select('id').single();
      if (error || !data) throw error ?? new Error('Item could not be saved.');
      return data;
    },
    async saveMany(items) {
      if (!Array.isArray(items) || !items.length || items.length > 50) throw new Error('Choose between 1 and 50 ingredients.');
      const values = items.map((item) => ({ ...validateFood(item), owner_id: userId }));
      const { data, error } = await table().insert(values).select('id');
      if (error || data?.length !== items.length) throw error ?? new Error('Ingredient additions could not be confirmed.');
      return data;
    },
    async remove(id) {
      const { data, error } = await table().delete().eq('owner_id', userId).eq('id', id).select('id').single();
      if (error || !data) throw error ?? new Error('Item could not be deleted.');
    },
  };
}
