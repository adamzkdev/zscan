/** zkSNARKs are 26 × 26 pixel portraits (drawn at 520 px). */
export const PIX = 26;

/** A picture as its 26 × 26 pixels, RGB over black, row by row. Apparition art carries a fine
 *  texture inside each pixel, so each one is the average of its block. */
export async function pixels(url: string): Promise<Uint8ClampedArray> {
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = PIX;
  c.height = PIX;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, PIX, PIX);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, PIX, PIX);
  const rgba = ctx.getImageData(0, 0, PIX, PIX).data;
  const out = new Uint8ClampedArray(PIX * PIX * 3);
  for (let i = 0; i < PIX * PIX; i++) {
    out[i * 3] = rgba[i * 4];
    out[i * 3 + 1] = rgba[i * 4 + 1];
    out[i * 3 + 2] = rgba[i * 4 + 2];
  }
  return out;
}

/** Background pixels (the collection draws on black) carry no particle. */
export const lit = (p: Uint8ClampedArray, i: number) => p[i * 3] + p[i * 3 + 1] + p[i * 3 + 2] > 42;
