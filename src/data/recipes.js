// Original, small recipe library for transparent prototype matching. Amounts
// describe a two-portion recipe, not quantities inferred from pantry records.
const ingredient = (name, quantity, unit, aliases) => ({ name, quantity, unit, aliases });
export const RECIPES = [
  { id: 'carrot-lentil-soup', name: 'Carrot and red lentil soup', serves: 2,
    ingredients: [ingredient('Carrots', 300, 'g', ['carrot','carrots']), ingredient('Red lentils', 150, 'g', ['red lentils','dry red lentils']), ingredient('Onion', 1, 'item', ['onion','onions']), ingredient('Vegetable stock', 750, 'ml', ['vegetable stock','vegetable broth'])],
    steps: ['Prepare and chop the vegetables; rinse the lentils as directed on their packaging.', 'Soften the onion and carrots in a little cooking oil, then add lentils and stock.', 'Simmer until the lentils and vegetables are fully tender, adding water if needed. Serve hot.'] },
  { id: 'chickpea-pasta', name: 'Tomato and chickpea pasta', serves: 2,
    ingredients: [ingredient('Pasta', 160, 'g', ['pasta','spaghetti','penne']), ingredient('Canned chickpeas', 1, 'can', ['canned chickpeas','tinned chickpeas']), ingredient('Canned tomatoes', 1, 'can', ['canned tomatoes','tinned tomatoes','chopped tomatoes']), ingredient('Onion', 1, 'item', ['onion','onions'])],
    steps: ['Cook the pasta according to its packaging. Prepare the onion and drain the canned chickpeas.', 'Soften the onion in a little oil, then add tomatoes and chickpeas. Simmer until hot throughout.', 'Combine with the drained pasta and adjust seasoning to taste.'] },
  { id: 'spinach-omelette', name: 'Spinach and mushroom omelette', serves: 2,
    ingredients: [ingredient('Eggs', 4, 'items', ['egg','eggs']), ingredient('Spinach', 80, 'g', ['spinach','baby spinach']), ingredient('Mushrooms', 120, 'g', ['mushroom','mushrooms']), ingredient('Onion', 0.5, 'item', ['onion','onions'])],
    steps: ['Prepare the vegetables and beat the eggs.', 'Soften the onion and mushrooms in a little cooking oil, then add spinach and cook until wilted.', 'Add the eggs and cook until fully set. Divide into two portions.'] },
  { id: 'bean-wraps', name: 'Crunchy bean and vegetable wraps', serves: 2,
    ingredients: [ingredient('Wraps', 2, 'items', ['wraps','tortilla wraps','tortillas']), ingredient('Carrots', 1, 'item', ['carrot','carrots']), ingredient('Lettuce', 60, 'g', ['lettuce','cos lettuce']), ingredient('Canned beans', 1, 'can', ['canned beans','tinned beans','canned kidney beans','canned black beans'])],
    steps: ['Wash and prepare the fresh vegetables. Grate the carrot and shred the lettuce.', 'Drain ready-to-eat canned beans, following packaging instructions.', 'Warm the wraps if desired and fill with the beans and vegetables. Add a dressing of your choice.'] },
  { id: 'potato-pea-pan', name: 'Potato and pea skillet with eggs', serves: 2,
    ingredients: [ingredient('Potatoes', 400, 'g', ['potato','potatoes']), ingredient('Frozen peas', 120, 'g', ['frozen peas','peas']), ingredient('Onion', 1, 'item', ['onion','onions']), ingredient('Eggs', 2, 'items', ['egg','eggs'])],
    steps: ['Prepare and chop the potato and onion. Cook the potatoes in water until tender, then drain.', 'Soften the onion in a little oil, add potatoes and peas, and cook until hot throughout.', 'Cook the eggs until fully set and serve with the vegetables.'] },
];
