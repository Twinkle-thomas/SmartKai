export function createProgressService(client) {
  return {
    async load() {
      if (!client) throw new Error('Sign in to view progress.');
      const select = 'id,created_at,rule_version,scenario_key,overbuying,forgetting_food,poor_meal_planning,discarding_leftovers,storage_uncertainty';
      const query = (ascending) => client.from('assessments').select(select).is('scenario_key', null).order('created_at', { ascending }).order('id', { ascending }).limit(1);
      const [first, last] = await Promise.all([query(true), query(false)]);
      if (first.error || last.error) throw first.error ?? last.error;
      return { baseline: first.data[0] ?? null, latest: last.data[0] ?? null };
    },
  };
}
