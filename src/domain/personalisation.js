export const RULE_VERSION = 'provisional-v1';
export const FREQUENCY_SCORES = Object.freeze({ Never: 0, Sometimes: 1, Often: 2 });

// These questions operationalise the provisional profiles for prototype evaluation.
// Each indicator describes a practice that may contribute to waste, so higher is worse.
export const INDICATORS = Object.freeze([
  { id: 'overbuying', profile: 'Overbuyer', question: 'How often does this fictional household buy more food than it needs?', recommendationId: 'check-before-shopping', recommendation: 'Check the fridge and pantry before shopping and use a list with quantities.' },
  { id: 'forgettingFood', profile: 'Food Forgetter', question: 'How often does this fictional household forget food until it is no longer usable?', recommendationId: 'use-first-area', recommendation: 'Create a visible use-first area and check it regularly.' },
  { id: 'poorMealPlanning', profile: 'Poor Meal Planner', question: 'How often does this fictional household shop without considering upcoming meals?', recommendationId: 'plan-before-shopping', recommendation: 'Outline a few upcoming meals using food already available before writing a shopping list.' },
  { id: 'discardingLeftovers', profile: 'Leftover Discarder', question: 'How often does this fictional household discard leftovers instead of using them?', recommendationId: 'plan-leftover-use', recommendation: 'Plan an upcoming meal around suitable leftovers and prepare portions that match household needs.' },
  { id: 'storageUncertainty', profile: 'Storage Learner', question: 'How often is this fictional household unsure how to store its food?', recommendationId: 'check-storage-instructions', recommendation: 'Check food packaging for storage instructions and organise food so it is easy to find.' },
].map(Object.freeze));

const GENERAL_GUIDANCE = Object.freeze({ id: 'general-prevention', profile: null, text: 'Check food already available, shop with a list, and plan how to use food and suitable leftovers.' });

/** Requires all five integer scores; never silently treats missing answers as Never. */
export function personalise(scores) {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) {
    throw new TypeError('Provide an object containing all five indicator scores.');
  }
  const validKeys = INDICATORS.map(({ id }) => id);
  if (Object.keys(scores).some((key) => !validKeys.includes(key))) {
    throw new TypeError('Unknown indicator supplied.');
  }
  for (const id of validKeys) {
    if (!Object.hasOwn(scores, id) || !Number.isInteger(scores[id]) || scores[id] < 0 || scores[id] > 2) {
      throw new TypeError(`${id} must be an integer score of 0, 1, or 2.`);
    }
  }
  const matches = INDICATORS.filter(({ id }) => scores[id] === 2);
  return {
    ruleVersion: RULE_VERSION,
    profiles: matches.map(({ profile }) => profile),
    explanations: matches.map(({ id, profile }) => ({ indicator: id, profile, score: scores[id], threshold: 2 })),
    recommendations: matches.length
      ? matches.map(({ profile, recommendationId, recommendation }) => ({ id: recommendationId, profile, text: recommendation }))
      : [{ ...GENERAL_GUIDANCE }],
  };
}
