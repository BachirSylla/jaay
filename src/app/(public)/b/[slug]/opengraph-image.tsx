import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, previewUrl } from "@/features/catalog/og";
import { getPublicCatalog } from "@/features/catalog/public";
import { plural } from "@/lib/i18n";
import { fr } from "@/messages/fr";

export const alt = fr.publicCatalog.tagline;
export const size = OG_SIZE;
export const contentType = "image/png";

/** WhatsApp / social preview of a catalog: shop name and up to 3 product photos. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getPublicCatalog(slug);
  const name = catalog?.shop.name ?? fr.app.name;
  const photos = catalog
    ? (await Promise.all(catalog.products.slice(0, 6).map((p) => previewUrl(p.photos[0]))))
        .filter((url): url is string => url !== null)
        .slice(0, 3)
    : [];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: OG_COLORS.espresso,
        color: OG_COLORS.espressoInk,
        padding: 64,
        gap: 48,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          gap: 24,
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 28,
            background: OG_COLORS.tile,
            color: OG_COLORS.gold,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            fontWeight: 700,
          }}
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>{name}</div>
        <div style={{ fontSize: 32, color: OG_COLORS.espressoMuted }}>
          {catalog
            ? plural(catalog.products.length, fr.publicCatalog.models)
            : fr.publicCatalog.tagline}
        </div>
        <div style={{ fontSize: 26, color: OG_COLORS.gold }}>
          {fr.publicCatalog.orderOnWhatsapp}
        </div>
      </div>
      {photos.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 420 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>. */}
          <img
            src={photos[0]}
            alt=""
            width={420}
            height={photos.length > 1 ? 300 : 502}
            style={{ objectFit: "cover", borderRadius: 28 }}
          />
          {photos.length > 1 ? (
            <div style={{ display: "flex", gap: 16 }}>
              {photos.slice(1).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>.
                <img
                  key={url}
                  src={url}
                  alt=""
                  width={photos.length > 2 ? 202 : 420}
                  height={186}
                  style={{ objectFit: "cover", borderRadius: 24 }}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>,
    size,
  );
}
