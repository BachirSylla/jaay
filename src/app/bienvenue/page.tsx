import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateShopForm } from "@/features/shop/components/CreateShopForm";
import { getMyShops } from "@/features/shop/queries";
import { fr } from "@/messages/fr";

export const metadata: Metadata = { title: fr.welcome.title };

const t = fr.welcome;

export default function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <Suspense fallback={<Skeleton className="h-24 w-full rounded-2xl" />}>
        <WelcomeHeader />
      </Suspense>
      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <CreateShopForm />
      </div>
    </main>
  );
}

/** First shop: welcome text. Additional shop: "New shop" with a way back. */
async function WelcomeHeader() {
  const shops = await getMyShops();
  const firstShop = shops.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {firstShop ? (
        <Logo size={48} />
      ) : (
        <Link
          href="/app"
          className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-muted-foreground hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-[18px]" />
          {t.backToShops}
        </Link>
      )}
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px]">{firstShop ? t.title : t.newShopTitle}</h1>
        <p className="text-muted-foreground">{t.subtitle}</p>
      </div>
    </div>
  );
}
