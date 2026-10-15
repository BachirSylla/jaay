import Link from "next/link";
import { ChevronRight, PackagePlus } from "lucide-react";
import { cn } from "cn";
import { Money } from "@/components/shared/Money";
import { formatDate, formatQty } from "@/lib/format";
import { fr } from "@/messages/fr";
import type { ReceptionSummary } from "../types";

const t = fr.receptions;

export function ReceptionsList({
  receptions,
  slug,
}: {
  receptions: ReceptionSummary[];
  slug: string;
}) {
  return (
    <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
      {receptions.map((reception) => {
        const cancelled = reception.status === "cancelled";
        return (
          <li key={reception.id}>
            <Link
              href={`/s/${slug}/receptions/${reception.id}`}
              className="flex min-h-16 items-center gap-4 px-4 py-3 outline-none hover:bg-surface-muted/50 focus-visible:bg-surface-muted/60 sm:px-5"
            >
              <span
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-cognac-tint text-cognac"
              >
                <PackagePlus className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={cn("truncate font-semibold", cancelled && "line-through opacity-60")}
                >
                  {reception.supplierName}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(reception.receivedAt)} · {formatQty(reception.totalQty)}
                </span>
              </span>
              {cancelled ? (
                <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                  {t.cancelled}
                </span>
              ) : reception.totalCost !== null ? (
                <Money amount={reception.totalCost} size="md" />
              ) : null}
              <ChevronRight
                aria-hidden="true"
                className="size-5 shrink-0 text-subtle max-sm:hidden"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
