import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { getSale } from "@/features/sales/queries";
import { getShopContext } from "@/features/shop/queries";
import { formatDate, formatMoney } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { isUuid } from "@/lib/uuid";
import { fr } from "@/messages/fr";

const WIDTH = 1080;

/**
 * Receipt of a sale as a PNG, to share on WhatsApp. Same access rules as the sale itself
 * (session + RLS: a manager only gets their own sales). Never shows costs.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopSlug: string; id: string }> },
) {
  const { shopSlug, id } = await params;
  const context = await getShopContext(shopSlug);
  if (!context || !isUuid(id)) return new NextResponse(null, { status: 404 });
  const sale = await getSale(context.shop.id, id, false);
  if (!sale || sale.status !== "active") return new NextResponse(null, { status: 404 });

  const height = 720 + sale.lines.length * 96 + sale.payments.length * 56;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#F2F2EF",
        color: "#191714",
        fontSize: 34,
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
          {`${fr.sales.receiptTitle} — ${fill(fr.sales.numberShort, { n: sale.number })} · ${formatDate(sale.soldAt, "datetime")}`}
        </div>
      </div>

      <div
        style={{ display: "flex", flexDirection: "column", padding: "48px 64px", gap: 28, flex: 1 }}
      >
        {sale.lines.map((line) => (
          <div key={line.id} style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
              <span style={{ fontWeight: 700 }}>{line.productName}</span>
              <span style={{ color: "#6B655E", fontSize: 28 }}>
                {`${line.quantity} × ${formatMoney(line.unitPrice)}`}
              </span>
            </div>
            <span style={{ fontWeight: 700 }}>{formatMoney(line.lineTotal)}</span>
          </div>
        ))}

        <div style={{ display: "flex", height: 2, background: "#E3E0DA", margin: "8px 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 36, fontWeight: 700 }}>{fr.sales.total}</span>
          <span style={{ fontSize: 64, fontWeight: 700, color: "#A85A24" }}>
            {formatMoney(sale.totalAmount)}
          </span>
        </div>
        {sale.payments.map((payment) => (
          <div
            key={payment.method}
            style={{ display: "flex", justifyContent: "space-between", color: "#6B655E" }}
          >
            <span>{fr.paymentMethods[payment.method]}</span>
            <span>{formatMoney(payment.amount)}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          padding: "0 64px 56px",
        }}
      >
        <span style={{ fontSize: 36, fontWeight: 700, color: "#17694F" }}>{fr.sales.thanks}</span>
        <span style={{ fontSize: 24, color: "#8A847C" }}>{fr.sales.receiptFooter}</span>
      </div>
    </div>,
    {
      width: WIDTH,
      height,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
