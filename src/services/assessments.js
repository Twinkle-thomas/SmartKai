import { personalise } from '../domain/personalisation.js';
import { SCENARIOS } from '../data/scenarios.js';

const SCORE_COLUMNS = {
  overbuying: 'overbuying', forgettingFood: 'forgetting_food',
  poorMealPlanning: 'poor_meal_planning', discardingLeftovers: 'discarding_leftovers',
  storageUncertainty: 'storage_uncertainty',
};

export function createAssessmentService(client) {
  function requireClient() {
    if (!client) throw new Error('Supabase is not configured. Local guidance is still available.');
  }
  return {
    async save(scores, scenarioId = null) {
      requireClient();
      personalise(scores); // Validate before making a network request.
      if (scenarioId !== null) {
        const scenario = SCENARIOS.find(({ id }) => id === scenarioId);
        if (!scenario || Object.keys(SCORE_COLUMNS).some((key) => scenario.scores[key] !== scores[key])) {
          throw new Error('Scenario must match the submitted fictional answers.');
        }
      }
      const { data, error } = await client.rpc('save_fictional_assessment', {
        p_scores: Object.fromEntries(Object.entries(SCORE_COLUMNS).map(([key, column]) => [column, scores[key]])),
        p_scenario_key: scenarioId,
      });
      if (error) throw new Error('Could not save the fictional assessment. Check your evaluator sign-in and database setup.', { cause: error });
      return data;
    },
    async list() {
      requireClient();
      const { data, error } = await client.from('assessments')
        .select('id,created_at,rule_version,scenario_key,overbuying,forgetting_food,poor_meal_planning,discarding_leftovers,storage_uncertainty,households(fictional_label),assessment_results(profiles,explanations,recommendations)')
        .order('created_at', { ascending: false }).limit(50);
      if (error) throw new Error('Could not load saved fictional assessments.', { cause: error });
      return data;
    },
  };
}
