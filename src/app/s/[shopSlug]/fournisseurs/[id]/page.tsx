import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Banknote, MapPin, PackagePlus, Phone, StickyNote, Undo2 } from "lucide-react";
import { cn } from "cn";
import { Forbidden } from "@/components/layout/Forbidden";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { InfoRow } from "@/components/shared/InfoRow";
import { Money } from "@/components/shared/Money";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { Button } from "@/components/ui/button";
import { listProducts } from "@/features/catalog/queries";
import { getReceptions } from "@/features/receptions/queries";
import { listReturns } from "@/features/returns/queries";
import { requireShopAction } from "@/features/shop/require";
import { CancelPaymentButton } from "@/features/suppliers/components/CancelPaymentButton";
import { SupplierActions } from "@/features/suppliers/components/SupplierActions";
import { SupplierPaymentDialog } from "@/features/suppliers/components/SupplierPaymentDialog";
import { SupplierTabs } from "@/features/suppliers/components/SupplierTabs";
import {
  getSupplier,
  getSupplierBalances,
  getSupplierLots,
  listSupplierPayments,
} from "@/features/suppliers/queries";
import { formatDate, formatMoney, formatQty } from "@/lib/format";
import { fill } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import { isUuid } from "@/lib/uuid";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.suppliers.title };

const t = fr.suppliers;
const a = fr.supplierAccount;

export default function SupplierPage({ params }: PageProps<"/s/[shopSlug]/fournisseurs/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SupplierDetail params={params} />
    </Suspense>
  );
}

type HistoryEvent = {
  key: string;
  kind: "reception" | "return" | "payment";
  date: string;
  detail: string;
  amount: number | null;
  cancelled: boolean;
  href: string | null;
  paymentId: string | null;
};

async function SupplierDetail({ params }: { params: Promise<{ shopSlug: string; id: string }> }) {
  const { context, allowed } = await requireShopAction(params, "viewSuppliers");
  if (!allowed) return <Forbidden title={t.title} />;
  const { id } = await params;
  const shop = context.shop;
  const supplier = isUuid(id) ? await getSupplier(shop.id, id) : null;
  if (!supplier) notFound();

  const [balances, lots, payments, receptions, returns, products] = await Promise.all([
    getSupplierBalances(shop.id),
    getSupplierLots(supplier.id),
    listSupplierPayments(shop.id, supplier.id),
    getReceptions(shop.id),
    listReturns(shop.id, { supplierId: supplier.id }),
    listProducts(shop.id),
  ]);
  const account = balances[supplier.id] ?? {
    due: 0,
    paid: 0,
    balance: 0,
    qtyReceived: 0,
    qtySold: 0,
    qtyReturned: 0,
    qtyInStock: 0,
  };
  const productById = new Map(products.map((p) => [p.id, p]));
  const advance = account.balance < 0;
  const openLots = lots.filter((lot) => lot.qtyAvailable > 0);

  const history: HistoryEvent[] = [
    ...receptions
      .filter((r) => r.supplierId === supplier.id)
      .map((r) => ({
        key: `r-${r.id}`,
        kind: "reception" as const,
        date: r.receivedAt,
        detail: formatQty(r.totalQty),
        amount: r.totalCost,
        cancelled: r.status === "cancelled",
        href: `/s/${shop.slug}/receptions/${r.id}`,
        paymentId: null,
      })),
    ...returns.map((r) => ({
      key: `t-${r.id}`,
      kind: "return" as const,
      date: r.returnedAt,
      detail: formatQty(r.bags),
      amount: null,
      cancelled: r.status === "cancelled",
      href: `/s/${shop.slug}/retours/${r.id}`,
      paymentId: null,
    })),
    ...payments.map((p) => ({
      key: `p-${p.id}`,
      kind: "payment" as const,
      date: p.paidAt,
      detail: [fr.paymentMethods[p.method], p.note].filter(Boolean).join(" · "),
      amount: p.amount,
      cancelled: p.status === "cancelled",
      href: null,
      paymentId: p.status === "active" ? p.id : null,
    })),
  ].sort((x, y) => y.date.localeCompare(x.date));

  const empty = (text: string) => (
    <p className="rounded-2xl border border-dashed border-line bg-surface px-5 py-6 text-center text-muted-foreground">
      {text}
    </p>
  );

  const lotsView =
    openLots.length === 0 ? (
      empty(a.noLots)
    ) : (
      <ul className="flex flex-col gap-3">
        {openLots.map((lot) => {
          const product = productById.get(lot.productId);
          const soldPct = (lot.qtySold / lot.qtyReceived) * 100;
          const returnedPct = (lot.qtyReturned / lot.qtyReceived) * 100;
          return (
            <li
              key={lot.lotId}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4"
            >
              <div className="flex items-center gap-3">
                <ProductThumb
                  name={product?.name ?? ""}
                  color={product?.color}
                  photoPath={product?.photos[0]?.storagePath}
                  size={48}
                  className="size-12 shrink-0"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{product?.name}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {fill(a.lotOf, { date: formatDate(lot.receivedAt) })} ·{" "}
                    {formatMoney(lot.unitCost)}
                  </span>
                </div>
                <span className="text-right">
                  <span className="block font-display text-lg font-bold tabular-nums">
                    {lot.qtyAvailable}/{lot.qtyReceived}
                  </span>
                  <span className="text-xs text-muted-foreground">{a.inStock}</span>
                </span>
              </div>
              <div
                role="img"
                aria-label={`${a.sold} ${lot.qtySold}, ${a.returned} ${lot.qtyReturned}, ${a.inStock} ${lot.qtyAvailable}`}
                className="flex h-2 overflow-hidden rounded-full bg-surface-muted"
              >
                <span className="h-full bg-emerald" style={{ width: `${soldPct}%` }} />
                <span className="h-full bg-subtle" style={{ width: `${returnedPct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    );

  const icons = {
    reception: <PackagePlus />,
    return: <Undo2 />,
    payment: <Banknote className="text-emerald" />,
  };

  const historyView =
    history.length === 0 ? (
      empty(a.noHistory)
    ) : (
      <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
        {history.map((event) => {
          const body = (
            <>
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted [&_svg]:size-[18px]"
              >
                {icons[event.kind]}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("font-semibold", event.cancelled && "line-through opacity-60")}>
                  {a.history[event.kind]}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {formatDate(event.date)} · {event.detail}
                </span>
              </span>
              {event.amount !== null ? (
                <Money
                  amount={event.amount}
                  size="md"
                  variant={event.kind === "payment" && !event.cancelled ? "positive" : "default"}
                  className={event.cancelled ? "line-through opacity-60" : undefined}
                />
              ) : null}
            </>
          );
          return (
            <li key={event.key} className="flex items-center gap-2 pr-3">
              {event.href ? (
                <Link
                  href={event.href}
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-3 pl-4 hover:bg-surface-muted/40"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-3 pl-4">
                  {body}
                </div>
              )}
              {event.paymentId ? <CancelPaymentButton paymentId={event.paymentId} /> : null}
            </li>
          );
        })}
      </ul>
    );

  return (
    <div className="max-w-5xl">
      <PageHeader
        backHref={`/s/${shop.slug}/fournisseurs`}
        eyebrow={
          supplier.archivedAt ? fr.common.archived : `${t.since} ${formatDate(supplier.createdAt)}`
        }
        title={supplier.name}
        actions={<SupplierActions supplier={supplier} />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-3xl bg-espresso p-5 text-espresso-ink">
            <span className="text-[13px] font-medium text-espresso-muted">
              {advance ? a.advance : a.balanceDue}
            </span>
            <Money
              amount={Math.abs(account.balance)}
              size="hero"
              currencyClassName="text-gold"
              className={advance ? "text-mint" : undefined}
            />
            <span className="text-[13px] text-espresso-muted">
              {advance
                ? a.advanceHint
                : fill(a.dueDetail, {
                    due: formatMoney(account.due),
                    paid: formatMoney(account.paid),
                  })}
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              <SupplierPaymentDialog supplierId={supplier.id} balance={account.balance} />
              {account.qtyInStock > 0 ? (
                <Button
                  asChild
                  variant="ghost"
                  className="text-espresso-ink hover:bg-espresso-ink/10 hover:text-espresso-ink"
                >
                  <Link href={`/s/${shop.slug}/retours/nouveau?fournisseur=${supplier.id}`}>
                    <Undo2 data-icon="inline-start" aria-hidden="true" />
                    {a.returnUnsold}
                  </Link>
                </Button>
              ) : null}
            </div>
          </section>

          <dl className="grid grid-cols-4 gap-2 rounded-2xl border border-line bg-surface p-4 text-center">
            {(
              [
                [a.entrusted, account.qtyReceived],
                [a.sold, account.qtySold],
                [a.returned, account.qtyReturned],
                [a.inStock, account.qtyInStock],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex flex-col-reverse gap-0.5">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-display text-xl font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <dl className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
            <InfoRow icon={<Phone />} label={fr.common.phone}>
              {supplier.phone ? formatPhone(supplier.phone) : "—"}
            </InfoRow>
            <InfoRow icon={<MapPin />} label={t.address}>
              {supplier.address ?? "—"}
            </InfoRow>
            <InfoRow icon={<StickyNote />} label={t.notes}>
              <span className="whitespace-pre-line">{supplier.notes ?? "—"}</span>
            </InfoRow>
          </dl>
        </div>

        <section className="min-w-0">
          <SupplierTabs lots={lotsView} history={historyView} />
        </section>
      </div>
    </div>
  );
}
