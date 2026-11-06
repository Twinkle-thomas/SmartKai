import { validateDiscard } from '../domain/waste.js';
export function createWasteService(client, userId) {
  function authorised() { if (!client || !userId) throw new Error('Sign in to record food waste.'); }
  return {
    async record(input, requestId, pantryId = null) {
      authorised();
      const food = validateDiscard(input);
      const { data, error } = await client.rpc('record_waste_discard', { p_request: requestId, p_food: pantryId, p_date: food.event_date, p_name: food.food_name, p_category: food.category, p_quantity: food.quantity, p_unit: food.unit, p_reason: food.reason, p_notes: food.notes });
      if (error) throw error;
      return data;
    },
    async list(start, end) {
      authorised();
      const rows = [];
      // Explicit pages prevent the server row limit silently truncating totals.
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await client.from('inventory_events').select('*').eq('owner_id',userId).eq('outcome','Discarded').gte('event_date',start).lte('event_date',end).order('event_date').order('id').range(offset,offset+499);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 500) return rows;
      }
    },
    async baseline() {
      authorised();
      const { data, error } = await client.from('waste_baselines').select('start_date').eq('owner_id',userId).maybeSingle();
      if (error) throw error;
      return data?.start_date ?? null;
    },
    async setBaseline(start) {
      authorised();
      const { error } = await client.from('waste_baselines').upsert({ owner_id:userId,start_date:start },{onConflict:'owner_id'});
      if (error) throw error;
    },
  };
}
