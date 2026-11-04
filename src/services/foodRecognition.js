import { foodSuggestions } from '../domain/foodRecognition.js';

let modelPromise;
async function loadDetector() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import('@tensorflow/tfjs-core');
      await Promise.all([import('@tensorflow/tfjs-backend-cpu'), import('@tensorflow/tfjs-backend-webgl')]);
      let webgl = false;
      try { webgl = await tf.setBackend('webgl'); } catch { /* CPU remains available on older devices. */ }
      if (!webgl) await tf.setBackend('cpu');
      await tf.ready();
      const coco = await import('@tensorflow-models/coco-ssd');
      const model = await coco.load({ base: 'lite_mobilenet_v2' });
      return { tf, model };
    })().catch((error) => { modelPromise = null; throw error; });
  }
  return modelPromise;
}

export async function recognizeFood(image, onStage = () => {}) {
  onStage('loading');
  const { tf, model } = await loadDetector();
  onStage('analysing');
  await tf.nextFrame();
  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image processing is unavailable.');
  try {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    // Detection is local. Only public model weights are fetched from Google's
    // model host; no image, tensor or prediction is sent to an inference API.
    return foodSuggestions(await model.detect(canvas, 20, 0.5));
  } finally { canvas.width = 0; canvas.height = 0; }
}
