import { ImageResponse } from "next/og";

// App icons: a gold "J" on a rounded espresso square (DESIGN.md §10). Generated at build time.
const ICONS = {
  "icon-192.png": { size: 192, maskable: false },
  "icon-512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
  "apple-180.png": { size: 180, maskable: true },
} as const;

type IconName = keyof typeof ICONS;

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const icon = ICONS[name as IconName];
  if (!icon) return new Response(null, { status: 404 });
  const { size, maskable } = icon;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: maskable ? "#211A15" : "transparent",
      }}
    >
      <div
        style={{
          // Maskable icons keep the letter inside the 80% safe zone.
          width: maskable ? "100%" : "88%",
          height: maskable ? "100%" : "88%",
          borderRadius: maskable ? 0 : size * 0.22,
          background: "#211A15",
          color: "#F2C894",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * (maskable ? 0.46 : 0.56),
          fontWeight: 700,
        }}
      >
        J
      </div>
    </div>,
    { width: size, height: size },
  );
}
