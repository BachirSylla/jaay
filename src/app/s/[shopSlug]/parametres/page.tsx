import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Users } from "lucide-react";
import { Forbidden } from "@/components/layout/Forbidden";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ShopSettingsForm } from "@/features/shop/components/ShopSettingsForm";
import { requireShopAction } from "@/features/shop/require";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.settings.title };

const t = fr.settings;

export default function SettingsPage({ params }: PageProps<"/s/[shopSlug]/parametres">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Settings params={params} />
    </Suspense>
  );
}

async function Settings({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { context, allowed } = await requireShopAction(params, "manageSettings");
  if (!allowed) return <Forbidden title={t.title} />;

  return (
    <>
      <PageHeader title={t.title} />
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="min-w-0 rounded-2xl border border-line bg-surface p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-lg">{t.general}</h2>
          <p className="mb-5 text-sm text-muted-foreground">{t.generalHint}</p>
          <ShopSettingsForm />
        </section>

        <div className="flex min-w-0 flex-col gap-5">
          <Link
            href={`/s/${context.shop.slug}/parametres/membres`}
            className="flex min-h-20 items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition-transform duration-150 ease-out outline-none hover:border-cognac/40 focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-[0.98]"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-cognac-tint text-cognac">
              <Users aria-hidden="true" className="size-5" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="font-display text-lg font-bold">{t.members}</span>
              <span className="text-sm text-muted-foreground">{t.membersHint}</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-5 text-subtle" />
          </Link>

          <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-lg">{t.appearance}</h2>
            <ThemeToggle className="w-full" />
          </section>
        </div>
      </div>
    </>
  );
}
