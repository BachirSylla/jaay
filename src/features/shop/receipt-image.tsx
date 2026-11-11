import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { logoCopyPathFor } from "@/lib/image";
import { shopLogoUrl } from "@/lib/storage";

/** Pieces shared by the receipt images drawn with next/og (sale, supplier payment). */

export const DISPLAY_FONT = "Bricolage Grotesque";
const EMERALD = "#17694F";

function font(file: string) {
  return readFile(join(process.cwd(), "src/assets/fonts", file));
}

/** Design fonts for ImageResponse (DM Sans for text, Bricolage Grotesque for titles). */
export async function receiptFonts() {
  const [regular, semiBold, display] = await Promise.all([
    font("DMSans-Regular.ttf"),
    font("DMSans-SemiBold.ttf"),
    font("BricolageGrotesque-Bold.ttf"),
  ]);
  return [
    { name: "DM Sans", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "DM Sans", data: semiBold, weight: 600 as const, style: "normal" as const },
    { name: DISPLAY_FONT, data: display, weight: 700 as const, style: "normal" as const },
  ];
}

/** PNG copy of the logo (next/og cannot read WebP); logos sent before it have none. */
export async function shopLogoForImage(path: string | null): Promise<string | null> {
  if (!path) return null;
  const url = shopLogoUrl(logoCopyPathFor(path));
  try {
    return (await fetch(url, { method: "HEAD" })).ok ? url : null;
  } catch {
    return null;
  }
}

/** Logo of the shop, or its initial in gold when there is no usable logo. */
export function ShopMark({
  logo,
  name,
  size,
}: {
  logo: string | null;
  name: string;
  size: number;
}) {
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by next/og
    <img
      src={logo}
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: size / 4, objectFit: "cover" }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        background: "#191410",
        color: "#F2C894",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: DISPLAY_FONT,
        fontSize: size * 0.54,
      }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

/** Green "PAYÉ" stamp with its date, slightly rotated. */
export function PaidStamp({ label, date }: { label: string; date: string }) {
  return (
    <div
      style={{
        display: "flex",
        marginRight: 24,
        padding: 7,
        border: `7px solid ${EMERALD}`,
        borderRadius: 22,
        color: EMERALD,
        opacity: 0.88,
        transform: "rotate(-12deg)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "8px 30px",
          border: `3px solid ${EMERALD}`,
          borderRadius: 12,
        }}
      >
        <span style={{ fontFamily: DISPLAY_FONT, fontSize: 74, letterSpacing: 7 }}>{label}</span>
        <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: 1 }}>{date}</span>
      </div>
    </div>
  );
}
