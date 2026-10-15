import Link from "next/link";
import { cn } from "cn";
import type { PeriodKey } from "@/lib/period";
import { fr } from "@/messages/fr";

/** Period switch made of links (the period lives in the URL, pages render on the server). */
export function PeriodLinks({
  current,
  hrefFor,
  keys = ["jour", "semaine", "mois"],
  className,
}: {
  current: PeriodKey;
  hrefFor: (key: PeriodKey) => string;
  keys?: PeriodKey[];
  className?: string;
}) {
  return (
    <nav
      aria-label={fr.dashboard.periodLabel}
      className={cn("inline-flex rounded-[12px] bg-surface-muted p-1", className)}
    >
      {keys.map((key) => {
        const active = key === current;
        return (
          <Link
            key={key}
            href={hrefFor(key)}
            aria-current={active ? "page" : undefined}
            scroll={false}
            className={cn(
              "inline-flex min-h-10 flex-1 items-center justify-center rounded-sm px-3 text-sm font-semibold whitespace-nowrap transition-[background-color,color] duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
              active
                ? "bg-surface text-ink shadow-segment"
                : "text-muted-foreground hover:text-ink",
            )}
          >
            {fr.dashboard.periods[key]}
          </Link>
        );
      })}
    </nav>
  );
}
