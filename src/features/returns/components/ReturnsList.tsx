import Link from "next/link";
import { ChevronRight, Undo2 } from "lucide-react";
import { cn } from "cn";
import { formatDate, formatQty } from "@/lib/format";
import { fr } from "@/messages/fr";
import type { ReturnSummary } from "../types";

export function ReturnsList({ returns, slug }: { returns: ReturnSummary[]; slug: string }) {
  return (
    <ul className="divide-y divide-line-soft overflow-hidden rounded-2xl border border-line bg-surface">
      {returns.map((item) => {
        const cancelled = item.status === "cancelled";
        return (
          <li key={item.id}>
            <Link
              href={`/s/${slug}/retours/${item.id}`}
              className="flex min-h-16 items-center gap-4 px-4 py-3 outline-none hover:bg-surface-muted/50 focus-visible:bg-surface-muted/60 sm:px-5"
            >
              <span
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-muted text-ink"
              >
                <Undo2 className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={cn("truncate font-semibold", cancelled && "line-through opacity-60")}
                >
                  {item.supplierName}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {formatDate(item.returnedAt)} · {formatQty(item.bags)} ·{" "}
                  {item.items.map((i) => i.productName).join(", ")}
                </span>
              </span>
              {cancelled ? (
                <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                  {fr.returns.cancelled}
                </span>
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
