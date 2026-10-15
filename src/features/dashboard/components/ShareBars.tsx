import { Money } from "@/components/shared/Money";

/** Horizontal share bars (one neutral hue: identity is in the row label, not the color). */
export function ShareBars({
  rows,
  emptyText,
}: {
  rows: { key: string; label: string; amount: number; detail?: string }[];
  emptyText: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  if (total === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const share = Math.round((row.amount / total) * 100);
        return (
          <li key={row.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">
                {row.label}
                {row.detail ? <span className="text-muted-foreground"> · {row.detail}</span> : null}
              </span>
              <span className="flex items-baseline gap-2">
                <span className="text-muted-foreground tabular-nums">{share} %</span>
                <Money amount={row.amount} size="sm" />
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-cognac" style={{ width: `${share}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
