export const FOOD_CLASSES = Object.freeze({ banana: 'Banana', apple: 'Apple', orange: 'Orange', broccoli: 'Broccoli', carrot: 'Carrot', sandwich: 'Sandwich', 'hot dog': 'Hot dog', pizza: 'Pizza', donut: 'Doughnut', cake: 'Cake' });
export const PHOTO_LIMIT = 8 * 1024 * 1024;

export function validateFoodPhoto(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP photo. Convert HEIC photos to JPEG first.');
  if (file.size <= 0 || file.size > PHOTO_LIMIT) throw new Error('Choose a photo smaller than 8 MB.');
}

// A label is a possible food type, never an inferred inventory quantity.
export function foodSuggestions(predictions) {
  const unique = new Map();
  for (const prediction of predictions) {
    if (!Object.hasOwn(FOOD_CLASSES, prediction.class) || !Number.isFinite(prediction.score) || prediction.score < 0.5 || prediction.score > 1) continue;
    if (!unique.has(prediction.class)) unique.set(prediction.class, { key: prediction.class, name: FOOD_CLASSES[prediction.class] });
  }
  return [...unique.values()];
}
