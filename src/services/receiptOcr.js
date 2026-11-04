const abortError = () => new DOMException('Receipt reading cancelled.', 'AbortError');

export async function readReceipt(image, { signal, onProgress = () => {} } = {}) {
  let worker;
  let canvas;
  let cancelled = signal?.aborted ?? false;
  let rejectAbort;
  const aborted = new Promise((_, reject) => { rejectAbort = reject; });
  aborted.catch(() => {});
  const guard = (task) => Promise.race([task, aborted]);
  const cancel = () => { cancelled = true; rejectAbort(abortError()); if (worker) void worker.terminate().catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    if (cancelled) throw abortError();
    const { createWorker } = await guard(import('tesseract.js'));
    if (cancelled) throw abortError();
    worker = await guard(createWorker('eng', 1, {
      cacheMethod: 'none',
      errorHandler: () => {}, // Worker job rejection is handled by this function.
      logger: (entry) => {
        if (!cancelled && Number.isFinite(entry.progress)) onProgress({ status: entry.status, progress: Math.min(1, Math.max(0, entry.progress)) });
      },
    }).then((created) => {
      if (cancelled) void created.terminate().catch(() => {});
      else worker = created;
      return created;
    }));
    if (cancelled) throw abortError();
    await guard(worker.setParameters({ preserve_interword_spaces: '1' }));
    canvas = document.createElement('canvas');
    const scale = Math.min(1, 3000 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is unavailable.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    // Tesseract executes in a local worker. No receipt image/text is posted to an API.
    const { data } = await guard(worker.recognize(canvas));
    if (cancelled) throw abortError();
    return data.text ?? '';
  } finally {
    signal?.removeEventListener('abort', cancel);
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    if (worker) await worker.terminate().catch(() => {});
  }
}
