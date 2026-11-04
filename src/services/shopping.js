import { validateShoppingItem } from '../domain/shopping.js';

export function createShoppingService(client, userId) {
  function table() {
    if (!client || !userId) throw new Error('Sign in to manage your shopping list.');
    return client.from('shopping_items');
  }
  async function confirmed(query) {
    const { data, error } = await query.select('id').single();
    if (error || !data) throw error ?? new Error('Shopping change could not be confirmed.');
    return data;
  }
  return {
    async list() {
      const { data, error } = await table().select('*').eq('owner_id', userId).order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
    save(item, id = null) {
      const values = validateShoppingItem(item);
      return confirmed(id ? table().update(values).eq('owner_id', userId).eq('id', id) : table().insert({ ...values, owner_id: userId }));
    },
    setPurchased(id, purchased) {
      if (typeof purchased !== 'boolean') throw new Error('Invalid purchase status.');
      return confirmed(table().update({ purchased }).eq('owner_id', userId).eq('id', id));
    },
    remove(id) { return confirmed(table().delete().eq('owner_id', userId).eq('id', id)); },
  };
}
