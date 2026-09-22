/** Preserve wheel distance, including coalesced notches and trackpad deltas.
 * A regular 100 px notch keeps the familiar 12% step. Line/page wheel modes
 * are normalized before bounding pathological input to a finite zoom factor. */
export function wheelZoomFactor(
  delta: number,
  mode: number,
  pageHeight: number,
) {
  if (!Number.isFinite(delta)) return 1;
  const pixels = delta * (mode === 1 ? 40 : mode === 2 ? pageHeight : 1);
  return 1.12 ** (-Math.max(-600, Math.min(600, pixels)) / 100);
}
