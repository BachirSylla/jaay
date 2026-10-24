import { ColorDot } from "@/components/shared/ColorDot";
import { Money } from "@/components/shared/Money";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { formatQty } from "@/lib/format";
import { fr } from "@/messages/fr";
import type { ReceptionLine } from "../types";

const t = fr.receptions;

/** Lines of a reception with how much of each lot was sold, returned and is left. */
export function ReceptionLines({ lines }: { lines: ReceptionLine[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {lines.map((line) => {
        const left = line.qtyReceived - line.qtySold - line.qtyReturned;
        const soldPct = (line.qtySold / line.qtyReceived) * 100;
        const returnedPct = (line.qtyReturned / line.qtyReceived) * 100;
        return (
          <li
            key={line.lotId}
            className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4"
          >
            <div className="flex items-center gap-3">
              <ProductThumb
                name={line.productName}
                color={line.productColor}
                photoPath={line.photoPath}
                size={56}
                className="size-14 shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                  <span className="truncate">{line.productName}</span>
                  {line.colorName ? (
                    <>
                      <ColorDot color={line.colorName} />
                      <span className="shrink-0 text-sm font-medium text-muted-foreground">
                        {line.colorName}
                      </span>
                    </>
                  ) : null}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatQty(line.qtyReceived)}
                  {line.unitCost !== null ? (
                    <>
                      {" × "}
                      <Money amount={line.unitCost} size="sm" className="font-medium" />
                    </>
                  ) : null}
                </span>
              </div>
              {line.unitCost !== null ? (
                <Money amount={line.unitCost * line.qtyReceived} size="md" />
              ) : null}
            </div>
            <div
              className="flex h-2 overflow-hidden rounded-full bg-surface-muted"
              role="img"
              aria-label={`${t.sold} ${line.qtySold}, ${t.returned} ${line.qtyReturned}, ${t.left} ${left}`}
            >
              <span className="h-full bg-emerald" style={{ width: `${soldPct}%` }} />
              <span className="h-full bg-subtle" style={{ width: `${returnedPct}%` }} />
            </div>
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">{t.sold}</dt>
                <dd className="font-semibold tabular-nums">{line.qtySold}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t.returned}</dt>
                <dd className="font-semibold tabular-nums">{line.qtyReturned}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t.left}</dt>
                <dd className="font-semibold tabular-nums">{left}</dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
