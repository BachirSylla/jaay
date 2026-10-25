import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { previewUrl } from "@/features/catalog/og";
import { getShopContext } from "@/features/shop/queries";
import { getPaymentReceipt } from "@/features/suppliers/queries";
import { bagColorFor } from "@/lib/bag-colors";
import { formatDate, formatMoney } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { isUuid } from "@/lib/uuid";
import { fr } from "@/messages/fr";

const WIDTH = 1080;
const PHOTO = 132;
const t = fr.supplierAccount.receipt;

/** Thumbnail colors of DESIGN.md §2, for bags without photo. */
const BAG_HEX: Record<string, string> = {
  black: "#2A2521",
  brown: "#8A5530",
  caramel: "#C99A6B",
  sand: "#E2D3BE",
  navy: "#1F2A44",
};

/**
 * Receipt of a supplier payment as a PNG, to share on WhatsApp: the sold bags it pays for, at
 * supplier price, with their photo so the supplier recognizes them, any advance, and the
 * total. Never shows sale prices nor the account.
 * Owner/admin only, like the payments themselves.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopSlug: string; id: string; paymentId: string }> },
) {
  const { shopSlug, id, paymentId } = await params;
  const context = await getShopContext(shopSlug);
  if (!context || !can(context.role, "paySuppliers") || !isUuid(id) || !isUuid(paymentId)) {
    return new NextResponse(null, { status: 404 });
  }
  const receipt = await getPaymentReceipt(context.shop.id, id, paymentId);
  if (!receipt) return new NextResponse(null, { status: 404 });

  const photos = await Promise.all(
    receipt.lines.map((line) => previewUrl(line.photoPath ?? undefined)),
  );
  const rows = receipt.lines.length + (receipt.advance > 0 ? 1 : 0);
  const height = 860 + Math.max(1, rows) * (PHOTO + 32) + (receipt.payment.note ? 48 : 0);

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
          padding: "56px 64px 64px",
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
        <div style={{ display: "flex", color: "#CDBFB0", fontSize: 30, marginTop: 8 }}>
          {`${t.title} · ${formatDate(receipt.payment.paidAt, "long")}`}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 24, gap: 4 }}>
          <span style={{ color: "#CDBFB0", fontSize: 28 }}>
            {fill(t.to, { supplier: receipt.supplier.name })}
          </span>
          <span style={{ fontSize: 76, fontWeight: 700, color: "#F2C894" }}>
            {formatMoney(receipt.payment.amount)}
          </span>
          <span style={{ color: "#CDBFB0", fontSize: 28 }}>
            {fr.paymentMethods[receipt.payment.method]}
          </span>
          {receipt.payment.note ? (
            <span style={{ color: "#CDBFB0", fontSize: 26 }}>{receipt.payment.note}</span>
          ) : null}
        </div>
      </div>

      <div
        style={{ display: "flex", flexDirection: "column", padding: "48px 64px", gap: 32, flex: 1 }}
      >
        <span style={{ fontSize: 34, fontWeight: 700 }}>{t.covered}</span>
        {receipt.lines.length === 0 && receipt.advance === 0 ? (
          <span style={{ color: "#6B655E" }}>{t.noBags}</span>
        ) : null}
        {receipt.lines.map((line, index) => {
          const photo = photos[index];
          const bag = bagColorFor(line.color);
          const detail = `${line.bags} × ${formatMoney(line.unitCost)}`;
          return (
            <div key={line.key} style={{ display: "flex", alignItems: "center", gap: 28 }}>
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
                  {line.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6 }}>
                <span style={{ fontWeight: 700 }}>{line.name}</span>
                <span style={{ color: "#6B655E", fontSize: 28 }}>{detail}</span>
              </div>
              <span style={{ fontWeight: 700 }}>{formatMoney(line.amount)}</span>
            </div>
          );
        })}
        {receipt.advance > 0 ? (
          <div style={{ display: "flex", justifyContent: "space-between", color: "#6B655E" }}>
            <span>{t.advance}</span>
            <span style={{ fontWeight: 700, color: "#191714" }}>
              {formatMoney(receipt.advance)}
            </span>
          </div>
        ) : null}

        <div style={{ display: "flex", height: 2, background: "#E3E0DA", margin: "8px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 36, fontWeight: 700 }}>{t.total}</span>
          <span style={{ fontSize: 60, fontWeight: 700, color: "#A85A24" }}>
            {formatMoney(receipt.payment.amount)}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "0 64px 56px" }}>
        <span style={{ fontSize: 24, color: "#8A847C" }}>{t.footer}</span>
      </div>
    </div>,
    {
      width: WIDTH,
      height,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
