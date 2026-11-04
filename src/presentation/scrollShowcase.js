export function showcaseIndex(progress, count) {
  if (!Number.isFinite(progress) || count < 1) return 0;
  return Math.min(count - 1, Math.max(0, Math.floor(progress * count)));
}
