import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { initials } from "@/lib/initials";
import { shopLogoUrl } from "@/lib/storage";
import { fr } from "@/messages/fr";
import { contactLink } from "../public-links";
import type { PublicCatalog } from "../public";

/** Espresso header rounded at the bottom (mockup 5): logo, name, tagline, WhatsApp. */
export function PublicHeader({
  shop,
  children,
}: {
  shop: PublicCatalog["shop"];
  children?: ReactNode;
}) {
  return (
    <header className="rounded-b-[30px] bg-espresso pt-[max(2rem,env(safe-area-inset-top))] pb-8 text-espresso-ink">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 sm:px-10">
        <Link href={`/b/${shop.slug}`} className="flex items-center gap-3 self-start">
          {shop.logoPath ? (
            <span className="relative size-14 overflow-hidden rounded-2xl bg-espresso-ink/10">
              <Image
                src={shopLogoUrl(shop.logoPath)}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="grid size-14 place-items-center rounded-2xl bg-espresso-ink/10 font-display text-xl font-bold text-gold ring-1 ring-gold/15"
            >
              {initials(shop.name)}
            </span>
          )}
          <span className="font-display text-2xl font-bold sm:text-3xl">{shop.name}</span>
        </Link>
        <p className="max-w-lg text-espresso-muted">{fr.publicCatalog.tagline}</p>
        <div className="flex flex-wrap gap-2">
          {shop.whatsappPhone ? (
            <a
              href={contactLink({ ...shop, whatsappPhone: shop.whatsappPhone })}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "whatsapp" })}
            >
              <MessageCircle aria-hidden="true" />
              {fr.publicCatalog.contact}
            </a>
          ) : null}
          {children}
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="px-5 py-10 text-center text-sm text-muted-foreground">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 hover:text-ink">
        <span
          aria-hidden="true"
          className="grid size-6 place-items-center rounded-md bg-espresso font-display text-xs font-bold text-gold"
        >
          J
        </span>
        {fr.app.poweredBy}
      </Link>
    </footer>
  );
}
