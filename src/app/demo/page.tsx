import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Share2 } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Money } from "@/components/shared/Money";
import { StatCard } from "@/components/shared/StatCard";
import { StockBadge } from "@/components/shared/StockBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatQty } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.demo.title };

const t = fr.demo;

const swatches = [
  "ground",
  "surface",
  "surface-muted",
  "ink",
  "muted",
  "subtle",
  "line",
  "espresso",
  "espresso-ink",
  "gold",
  "cognac",
  "cognac-hover",
  "cognac-soft",
  "cognac-tint",
  "emerald",
  "emerald-soft",
  "mint",
  "danger",
  "danger-soft",
  "pay-wave",
  "pay-om",
  "pay-cash",
  "whatsapp",
  "bag-black",
  "bag-brown",
  "bag-caramel",
  "bag-sand",
  "bag-navy",
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg">{title}</h2>
      {children}
    </section>
  );
}

export default function DemoPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-10 px-5 py-8 lg:px-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] lg:text-[32px]">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        <ThemeToggle />
      </header>

      <Section title={t.cards}>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t.netProfit} amount={31000} sub={t.netProfitSub} variant="espresso" />
          <StatCard label={t.revenue} amount={96000} sub={t.revenueSub} />
          <StatCard label={t.supplierDue} amount={61000} sub={t.supplierDueSub} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                {t.sampleProduct}
                <StockBadge label={t.lowStock} />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-baseline justify-between">
              <span className="text-muted-foreground">{formatQty(2)}</span>
              <Money amount={8000} />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title={t.money}>
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-4 rounded-2xl border border-line bg-surface p-5">
          <Money amount={24500} size="sm" />
          <Money amount={24500} size="md" />
          <Money amount={24500} size="lg" />
          <Money amount={1250000} size="hero" />
          <Money amount={35000} size="lg" variant="positive" signed />
          <Money amount={-1500} size="lg" variant="negative" />
        </div>
      </Section>

      <Section title={t.buttons}>
        <div className="flex flex-wrap gap-3">
          <Button>{t.primaryAction}</Button>
          <Button variant="outline">
            <Share2 data-icon="inline-start" aria-hidden="true" />
            {t.secondaryAction}
          </Button>
          <Button variant="secondary">{t.secondaryAction}</Button>
          <Button variant="ghost">{t.ghostAction}</Button>
          <Button variant="destructive">{t.destructiveAction}</Button>
          <Button variant="whatsapp">{t.whatsappAction}</Button>
          <Button size="icon" variant="outline" aria-label={t.secondaryAction}>
            <Share2 aria-hidden="true" />
          </Button>
        </div>
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title={t.fields}>
          <div className="flex max-w-md flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="demo-customer">{t.customerName}</Label>
              <Input id="demo-customer" placeholder={t.customerNamePlaceholder} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="demo-price">{t.price}</Label>
              <Input
                id="demo-price"
                inputMode="numeric"
                defaultValue="8 000"
                className="font-display text-xl font-bold tabular-nums"
              />
            </div>
          </div>
        </Section>

        <Section title={t.typography}>
          <div className="flex flex-col gap-3">
            <Money amount={31000} size="hero" />
            <p className="font-display text-[28px] font-bold lg:text-[32px]">{t.screenTitle}</p>
            <p className="font-display text-lg font-bold">{t.sectionTitle}</p>
            <p>{t.body}</p>
            <p className="text-xs font-semibold text-muted-foreground uppercase">{t.meta}</p>
          </div>
        </Section>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title={t.loading}>
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-xl" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </Section>

        <Section title={t.dialog}>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="self-start">
                {t.openDialog}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.dialogTitle}</DialogTitle>
                <DialogDescription>{t.dialogDescription}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="demo-reason">{t.reason}</Label>
                <Input id="demo-reason" />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">{fr.common.cancel}</Button>
                </DialogClose>
                <Button variant="destructive">{t.destructiveAction}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Section>
      </div>

      <Section title={t.colors}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {swatches.map((name) => (
            <li key={name} className="flex flex-col gap-1.5">
              <span
                className="h-14 rounded-xl border border-line"
                style={{ background: `var(--${name})` }}
              />
              <code className="text-xs text-muted-foreground">{name}</code>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
