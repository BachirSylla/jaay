export type CompressedImage = { blob: Blob; extension: "webp" | "jpg"; contentType: string };

/**
 * Resizes a photo to at most `maxSize` px on its longest side and encodes it in WebP.
 * Safari cannot encode WebP from a canvas: it falls back to JPEG. Runs in the browser.
 */
export async function compressImage(
  file: File,
  { maxSize = 1600, quality = 0.82 }: { maxSize?: number; quality?: number } = {},
): Promise<CompressedImage> {
  // imageOrientation applies the EXIF rotation of phone photos.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is not available");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  const webp = await encode("image/webp");
  if (webp && webp.type === "image/webp") {
    return { blob: webp, extension: "webp", contentType: "image/webp" };
  }
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("Image encoding failed");
  return { blob: jpeg, extension: "jpg", contentType: "image/jpeg" };
}
