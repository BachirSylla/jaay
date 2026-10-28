import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { previewUrl } from "@/features/catalog/og";
import { getShopContext } from "@/features/shop/queries";
import { getSupplier, getSupplierStockSheet } from "@/features/suppliers/queries";
import { STOCK_ROWS_PER_PAGE, stockPageCount } from "@/features/suppliers/stock-sheet";
import { bagColorFor } from "@/lib/bag-colors";
import { formatDate, formatMoney } from "@/lib/format";
import { fill, plural } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { isUuid } from "@/lib/uuid";
import { fr } from "@/messages/fr";

const WIDTH = 1080;
const PHOTO = 132;
const ROW = PHOTO + 32;
const t = fr.supplierAccount.stockSheet;

/** Thumbnail colors of DESIGN.md §2, for bags without photo. */
const BAG_HEX: Record<string, string> = {
  black: "#2A2521",
  brown: "#8A5530",
  caramel: "#C99A6B",
  sand: "#E2D3BE",
  navy: "#1F2A44",
};

/**
 * One page (?page=1…) of the supplier stock sheet as a PNG, to share on WhatsApp: the bags of
 * this supplier still in the shop, one row per model with its photo, supplier price, number of
 * bags and bags per color. Never shows sale prices. Owner/admin only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopSlug: string; id: string }> },
) {
  const { shopSlug, id } = await params;
  const context = await getShopContext(shopSlug);
  if (!context || !can(context.role, "viewSuppliers") || !isUuid(id)) {
    return new NextResponse(null, { status: 404 });
  }
  const [supplier, rows] = await Promise.all([
    getSupplier(context.shop.id, id),
    getSupplierStockSheet(context.shop.id, id),
  ]);
  if (!supplier) return new NextResponse(null, { status: 404 });

  const pages = stockPageCount(rows.length);
  const page = Math.min(pages, Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1));
  const pageRows = rows.slice((page - 1) * STOCK_ROWS_PER_PAGE, page * STOCK_ROWS_PER_PAGE);
  const photos = await Promise.all(pageRows.map((row) => previewUrl(row.photoPath ?? undefined)));
  const totalBags = rows.reduce((sum, row) => sum + row.bags, 0);
  const isLast = page === pages;
  const height =
    450 +
    pageRows.reduce((sum, row) => sum + ROW + (row.colors.length > 0 ? 12 : 0), 0) +
    (isLast ? 150 : 0);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#F2F2EF",
        color: "#191714",
        fontSize: 32,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "56px 64px 56px",
          background: "#211A15",
          color: "#F7F1EA",
          borderBottomLeftRadius: 48,
          borderBottomRightRadius: 48,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              background: "#191410",
              color: "#F2C894",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            {context.shop.name.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>{context.shop.name}</div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 700,
            color: "#F2C894",
            marginTop: 16,
          }}
        >
          {t.title}
        </div>
        <div style={{ display: "flex", color: "#CDBFB0", fontSize: 30 }}>
          {`${fill(t.supplier, { supplier: supplier.name })} · ${formatDate(new Date().toISOString(), "long")}`}
        </div>
        {pages > 1 ? (
          <div style={{ display: "flex", color: "#CDBFB0", fontSize: 26 }}>
            {fill(t.page, { n: page, total: pages })}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", padding: "40px 64px", gap: 32 }}>
        {pageRows.map((row, index) => {
          const photo = photos[index];
          const bag = bagColorFor(row.color);
          return (
            <div key={row.key} style={{ display: "flex", alignItems: "center", gap: 28 }}>
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by next/og
                <img
                  src={photo}
                  alt=""
                  width={PHOTO}
                  height={PHOTO}
                  style={{ borderRadius: 24, objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: PHOTO,
                    height: PHOTO,
                    borderRadius: 24,
                    background: BAG_HEX[bag.key],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: bag.key === "sand" || bag.key === "caramel" ? "#211A15" : "#F7F1EA",
                    fontSize: 56,
                    fontWeight: 700,
                  }}
                >
                  {row.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6 }}>
                <span style={{ fontWeight: 700 }}>{row.name}</span>
                <span style={{ color: "#6B655E", fontSize: 28 }}>
                  {fill(t.price, { amount: formatMoney(row.unitCost) })}
                </span>
                {row.colors.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 4 }}>
                    {row.colors.map((color) => (
                      <div
                        key={color.label}
                        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 28 }}
                      >
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            background: color.color
                              ? BAG_HEX[bagColorFor(color.color).key]
                              : "#F2F2EF",
                            border: color.color ? "2px solid #E3E0DA" : "2px dashed #8A847C",
                          }}
                        />
                        <span>{`${color.bags} ${color.label}`}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <span style={{ fontSize: 36, fontWeight: 700 }}>{plural(row.bags, t.bags)}</span>
            </div>
          );
        })}

        {isLast ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "2px solid #E3E0DA",
              paddingTop: 28,
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 36, fontWeight: 700 }}>{t.total}</span>
            <span style={{ fontSize: 56, fontWeight: 700, color: "#A85A24" }}>
              {plural(totalBags, t.bags)}
            </span>
          </div>
        ) : null}
      </div>
    </div>,
    {
      width: WIDTH,
      height,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
