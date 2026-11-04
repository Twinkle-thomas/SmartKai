// Keep research fixture wording and database identifiers out of product copy.
export function householdLabel(label) {
  return label ? label.replace(/^Fictional\s+/i, '').replace(/^Custom fictional household$/i, 'Your household') : 'Your household';
}

export function householdQuestion(question) {
  return question.replace('this fictional household', 'your household');
}
