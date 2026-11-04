// Optional real-model smoke check. Downloads public model weights, not a mock.
// Reads only the supplied local image; no image is uploaded to an API.
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import { load } from '@tensorflow-models/coco-ssd';
import sharp from 'sharp';
import { foodSuggestions } from '../src/domain/foodRecognition.js';

await tf.setBackend('cpu');
await tf.ready();
const model = await load({ base: 'lite_mobilenet_v2' });
try {
  const file = process.argv[2] ?? 'public/media/food/fresh-food-640.webp';
  const { data, info } = await sharp(file).rotate().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
  const input = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32');
  try {
    const predictions = await model.detect(input, 20, 0.5);
    console.log(JSON.stringify({ backend: tf.getBackend(), model: 'COCO-SSD lite_mobilenet_v2', possibleFoods: foodSuggestions(predictions), note: 'A smoke check is not a recognition-accuracy evaluation.' }, null, 2));
  } finally { input.dispose(); }
} finally { model.dispose(); }
