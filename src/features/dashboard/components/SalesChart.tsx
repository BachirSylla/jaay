"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatMoney } from "@/lib/format";
import { fr } from "@/messages/fr";
import type { DailySales } from "../queries";

const weekday = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short" });
const dayMonth = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

function label(day: string, many: boolean) {
  const date = new Date(`${day}T00:00:00Z`);
  return many ? dayMonth.format(date) : weekday.format(date);
}

/**
 * Revenue per day: one series (no legend, the title names it), thin bars with rounded ends,
 * the best day in cognac, a tooltip on hover and an equivalent table for screen readers.
 */
export function SalesChart({ data, title }: { data: DailySales; title: string }) {
  const many = data.length > 10;
  const best = data.reduce((max, d) => (d.revenue > max.revenue ? d : max), data[0]);
  const rows = data.map((d) => ({ ...d, label: label(d.day, many) }));

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-display text-lg font-bold">{title}</span>
        {best && best.revenue > 0 ? (
          <span className="text-[13px] text-muted-foreground">
            {fr.dashboard.bestDay} : {label(best.day, true)} · {formatMoney(best.revenue)}
          </span>
        ) : null}
      </figcaption>
      <div className="h-52 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--line-soft)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--line)" }}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-muted)", opacity: 0.6 }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as (typeof rows)[number] | undefined;
                if (!active || !point) return null;
                return (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-segment">
                    <div className="text-muted-foreground">{label(point.day, true)}</div>
                    <div className="font-display font-bold tabular-nums">
                      {formatMoney(point.revenue)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {point.salesCount} {fr.dashboard.sales.toLowerCase()}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
              {rows.map((row) => (
                <Cell
                  key={row.day}
                  fill={
                    row.day === best?.day && row.revenue > 0 ? "var(--cognac)" : "var(--subtle)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{fr.dashboard.chartTable}</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.day}>
              <th scope="row">{label(row.day, true)}</th>
              <td>{formatMoney(row.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
