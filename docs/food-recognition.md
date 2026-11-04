# Browser-based food-recognition preview

This is real local model inference, not the initially discussed simulation. The user changed the scope from simulated recognition to an option without a paid AI service. SmartKai now uses the Apache-2.0 TensorFlow.js COCO-SSD model (`lite_mobilenet_v2`) in the browser. No API account, billing credentials or recognition API key is required. Internet data, device processing and any deployment/hosting costs remain separate from API charges.

## Workflow and safeguards

1. A signed-in evaluator opens Pantry → **Add food from a photo**.
2. Choose/upload a JPEG, PNG or WebP, or use the camera file input where supported. File size is limited to 8 MB and decoded dimensions to 24 megapixels. HEIC and SVG are not supported.
3. Select the storage location manually and choose **Find possible foods**. A successful image decode is required first. No analysis runs automatically on upload.
4. The model downloads public weights from its upstream Google Storage host on first use, chooses WebGL when available with a CPU fallback, and analyses a local canvas resized to a maximum 1024-pixel edge. Model code and dependencies are dynamically imported. The model is reused during the page session; uploaded photos are not reused across accounts.
5. Only supported food detections with scores >=0.5 are kept, and repeated detections of the same class are grouped as one possible food type. This threshold is a provisional interface filter, not a calibrated guarantee of correctness. No confidence percentages or object-count-based inventory quantities are presented.
6. **Review [food]** copies a proposed name and the manually chosen location into the existing pantry form. Quantity and unit are blank and required. Food dates remain unrecorded. The user corrects the name, enters quantities and confirms **Add food item** through the existing authenticated pantry service.

The original photo stays in browser memory via a temporary object URL and is revoked when replaced, removed or the component unmounts. A resized analysis canvas is cleared after inference. The app does not upload the image to Supabase, an inference API or any other endpoint, and does not save predictions automatically. The model download is an ordinary request for public model files; the model host receives standard download-request metadata, not the photo. No new Supabase schema, storage bucket, secret or paid service is configured.

## Important limits

The COCO model supports 80 general object categories, of which SmartKai exposes these ten food classes: banana, apple, orange, broccoli, carrot, sandwich, hot dog, pizza, doughnut (model label `donut`) and cake. It cannot recognise a complete fridge or pantry inventory: milk, eggs, most packaged foods and many vegetables are outside this vocabulary. Occlusion, packaging, lighting and background clutter can cause missed or incorrect detections. Non-food detections such as refrigerators, people, bowls and bottles are ignored rather than guessed to be food.

It does not read labels or expiry dates, determine food quantity, assess freshness/safety, decide that food is a leftover or establish any reduction in household food waste. Empty results and download/inference failures offer manual entry, without falling back to fabricated or simulated detections. Use synthetic examples for evaluation; do not collect participant household photos.

## Validation

`npm test` includes file-type/size validation, filtering/deduplication of predictions, no automatic inference or saving, image decode errors, empty results, retry after failure, preview URL cleanup, and the explicit review → quantity/unit entry → pantry save path. Recognition is mocked in UI tests to verify application behaviour deterministically, not to claim model accuracy.

`npm run verify:food-model` performs an optional, separate real-model smoke check using the existing licensed local fresh-food photograph and the CPU backend. It downloads actual public weights and runs inference; the checked sample returned Orange and Broccoli as possible labels. This result is not a ground-truth accuracy evaluation. Pass another local test photo path as an argument for additional manual evaluation. The browser's WebGL execution, phone camera behaviour and performance on target mobile devices still require device testing.

Primary references: [model documentation and licence](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd), [official class vocabulary](https://github.com/tensorflow/tfjs-models/blob/master/coco-ssd/src/classes.ts). Package versions are pinned in package.json and the lockfile.
