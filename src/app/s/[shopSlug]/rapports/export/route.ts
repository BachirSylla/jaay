import { NextResponse, type NextRequest } from "next/server";
import { listExpenses } from "@/features/expenses/queries";
import { listSales } from "@/features/sales/queries";
import { getShopContext } from "@/features/shop/queries";
import { formatDate } from "@/lib/format";
import { periodRange } from "@/lib/period";
import { can } from "@/lib/permissions";
import { fr } from "@/messages/fr";

// CSV for Excel in French: ";" separator, UTF-8 with BOM, integer amounts (FCFA).
function csv(rows: (string | number | null)[][]): string {
  const cell = (value: string | number | null) => {
    const text = value === null ? "" : String(value);
    return /[";\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return "﻿" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
}

/** Sales lines or expenses of a period, as CSV. Owner/admin only. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopSlug: string }> },
) {
  const { shopSlug } = await params;
  const context = await getShopContext(shopSlug);
  if (!context || !can(context.role, "viewReports")) {
    return new NextResponse(null, { status: 404 });
  }
  const search = request.nextUrl.searchParams;
  const type = search.get("type") === "depenses" ? "depenses" : "ventes";
  const range = periodRange("libre", new Date(), {
    from: search.get("du") ?? undefined,
    to: search.get("au") ?? undefined,
  });
  const shop = context.shop;

  let body: string;
  if (type === "ventes") {
    const sales = await listSales(shop.id, {
      from: range.from,
      to: range.to,
      withCosts: true,
      limit: 5000,
    });
    const rows: (string | number | null)[][] = [
      [
        "Numéro",
        "Date",
        "Client",
        "Type de client",
        "Canal",
        "Modèle",
        "Quantité",
        "Prix unitaire",
        "Total ligne",
        "Coût fournisseur",
        "Marge",
        "Paiements",
        "Statut",
      ],
    ];
    for (const sale of [...sales].reverse()) {
      const payments = sale.payments
        .map((p) => `${fr.paymentMethods[p.method]} ${p.amount}`)
        .join(" + ");
      for (const line of sale.lines) {
        rows.push([
          sale.number,
          formatDate(sale.soldAt, "datetime"),
          sale.customerName ?? fr.sales.anonymous,
          sale.customerType === "reseller" ? fr.sales.reseller : fr.sales.individual,
          fr.channels[sale.channel],
          line.productName,
          line.quantity,
          line.unitPrice,
          line.lineTotal,
          line.cost,
          line.cost === null ? null : line.lineTotal - line.cost,
          payments,
          sale.status === "cancelled" ? fr.sales.cancelled : "",
        ]);
      }
    }
    body = csv(rows);
  } else {
    const expenses = (await listExpenses(shop.id)).filter((e) => {
      const at = new Date(e.spentAt);
      return at >= range.from && at < range.to;
    });
    const rows: (string | number | null)[][] = [
      ["Date", "Catégorie", "Montant", "Fournisseur", "Note", "Statut"],
      ...[...expenses]
        .reverse()
        .map((e) => [
          formatDate(e.spentAt, "datetime"),
          fr.expenses.categories[e.category],
          e.amount,
          e.supplierName,
          e.note,
          e.status === "cancelled" ? fr.expenses.cancelled : "",
        ]),
    ];
    body = csv(rows);
  }

  const filename = `jaay-${shop.slug}-${type}-${range.firstDay}-${range.lastDay}.csv`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
