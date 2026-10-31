// Synthetic fixtures only: no names, contact details, or real household observations.
const scores = (...values) => Object.fromEntries(
  ['overbuying', 'forgettingFood', 'poorMealPlanning', 'discardingLeftovers', 'storageUncertainty']
    .map((key, index) => [key, values[index]]),
);

export const SCENARIOS = [
  { id: 'no-frequent-indicators', label: 'Fictional Household A', scores: scores(0, 1, 0, 1, 0), expectedProfiles: [] },
  { id: 'overbuyer-only', label: 'Fictional Household B', scores: scores(2, 0, 1, 0, 1), expectedProfiles: ['Overbuyer'] },
  { id: 'forgetter-only', label: 'Fictional Household C', scores: scores(0, 2, 0, 1, 0), expectedProfiles: ['Food Forgetter'] },
  { id: 'planner-only', label: 'Fictional Household D', scores: scores(1, 0, 2, 0, 0), expectedProfiles: ['Poor Meal Planner'] },
  { id: 'leftovers-only', label: 'Fictional Household E', scores: scores(0, 1, 0, 2, 0), expectedProfiles: ['Leftover Discarder'] },
  { id: 'storage-only', label: 'Fictional Household F', scores: scores(0, 0, 1, 0, 2), expectedProfiles: ['Storage Learner'] },
  { id: 'multiple-profiles', label: 'Fictional Household G', scores: scores(2, 2, 0, 1, 2), expectedProfiles: ['Overbuyer', 'Food Forgetter', 'Storage Learner'] },
  { id: 'all-profiles', label: 'Fictional Household H', scores: scores(2, 2, 2, 2, 2), expectedProfiles: ['Overbuyer', 'Food Forgetter', 'Poor Meal Planner', 'Leftover Discarder', 'Storage Learner'] },
];
