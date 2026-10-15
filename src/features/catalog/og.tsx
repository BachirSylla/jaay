import "server-only";
import { previewPathFor } from "@/lib/image";
import { productPhotoUrl } from "@/lib/storage";

export const OG_SIZE = { width: 1200, height: 630 };

/** URL of the JPEG preview of a photo when it exists (photos uploaded before it had none). */
export async function previewUrl(photoPath: string | undefined): Promise<string | null> {
  if (!photoPath) return null;
  const url = productPhotoUrl(previewPathFor(photoPath));
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok ? url : null;
  } catch {
    return null;
  }
}

export const OG_COLORS = {
  espresso: "#211A15",
  espressoInk: "#F7F1EA",
  espressoMuted: "#CDBFB0",
  gold: "#F2C894",
  cognac: "#A85A24",
  tile: "#2F2620",
};
