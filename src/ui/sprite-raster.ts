/** Prepare at maximum map zoom, including display density. Window dimensions
 * bound the map viewport, so opening a drawer cannot make the image too small.
 * Camera gestures never resize or regenerate a sprite. */
export function spriteRasterScale(
  bounds: { w: number; h: number },
  maxZoom: number,
  viewport: { width: number; height: number; dpr: number },
) {
  return Math.max(
    1,
    Math.ceil(
      Math.min(viewport.width / bounds.w, viewport.height / bounds.h) *
        maxZoom *
        viewport.dpr,
    ),
  );
}

/** Preserve the exact SVG composition, including shadows and shared definitions,
 * but paint it once. Repeated GPU rasterization of SVG images can stall the
 * compositor even when JavaScript and layout are fast. PNG encoding is async.
 * The cache owns the resulting blob URL and revokes it after eviction. */
export async function rasterizeSprite(
  source: string,
  bounds: { width: number; height: number },
  scale: number,
): Promise<string> {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(bounds.width * scale));
  canvas.height = Math.max(1, Math.ceil(bounds.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  // Canvas may be disabled by the browser. The original vector asset still works.
  if (!context) return source;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) return source;
  const url = URL.createObjectURL(blob);
  try {
    image.src = url;
    await image.decode();
    return url;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
