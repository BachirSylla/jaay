"use client";

import { cn } from "cn";
import { Money } from "@/components/shared/Money";
import { PriceInput } from "@/components/shared/PriceInput";
import { fill } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";
import { fr } from "@/messages/fr";
import { PAYMENT_METHODS } from "../schemas";

export type PaymentMethodChoice = (typeof PAYMENT_METHODS)[number];
export type PaymentState = {
  method: PaymentMethodChoice;
  split: { method: PaymentMethodChoice; amount: number | null } | null;
};

const DOT: Record<PaymentMethodChoice, string> = {
  wave: "bg-pay-wave",
  orange_money: "bg-pay-om",
  cash: "bg-pay-cash",
};

/** Payments sent to create_sale: one method, or two with the first one taking the rest. */
export function paymentsFor(state: PaymentState, total: number) {
  if (!state.split) return [{ method: state.method, amount: total }];
  const second = state.split.amount ?? 0;
  return [
    { method: state.method, amount: total - second },
    { method: state.split.method, amount: second },
  ].filter((payment) => payment.amount > 0);
}

function Tiles({
  value,
  onChange,
  exclude,
  label,
}: {
  value: PaymentMethodChoice;
  onChange: (method: PaymentMethodChoice) => void;
  exclude?: PaymentMethodChoice;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-2">
      {PAYMENT_METHODS.map((method) => {
        const active = method === value;
        const disabled = method === exclude;
        return (
          <button
            key={method}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(method)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-xl border bg-surface px-2 text-sm font-semibold transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-35",
              active
                ? "border-2 border-cognac bg-cognac-soft"
                : "border-line hover:bg-surface-muted",
            )}
          >
            <span aria-hidden="true" className={cn("size-3 rounded-full", DOT[method])} />
            {fr.paymentMethods[method]}
          </button>
        );
      })}
    </div>
  );
}

/** PaymentPicker (DESIGN.md §6): 3 tiles, "Diviser en deux" opens a second line. */
export function PaymentPicker({
  value,
  total,
  onChange,
}: {
  value: PaymentState;
  total: number;
  onChange: (value: PaymentState) => void;
}) {
  const t = fr.sales;
  const otherMethod = (method: PaymentMethodChoice) =>
    PAYMENT_METHODS.find((m) => m !== method) ?? "cash";

  return (
    <div className="flex flex-col gap-3">
      <Tiles
        label={t.payment}
        value={value.method}
        exclude={value.split?.method}
        onChange={(method) => onChange({ ...value, method })}
      />

      {value.split ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-line p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{t.secondPayment}</span>
            <span className="text-muted-foreground">
              {fr.paymentMethods[value.method]} :{" "}
              <Money amount={Math.max(0, total - (value.split.amount ?? 0))} size="sm" />
            </span>
          </div>
          <Tiles
            label={t.secondPayment}
            value={value.split.method}
            exclude={value.method}
            onChange={(method) => onChange({ ...value, split: { ...value.split!, method } })}
          />
          <PriceInput
            aria-label={`${t.secondAmount} — ${fr.paymentMethods[value.split.method]}`}
            placeholder={t.secondAmount}
            value={value.split.amount}
            onValueChange={(amount) =>
              onChange({
                ...value,
                split: {
                  ...value.split!,
                  amount: amount === null ? null : Math.min(amount, total),
                },
              })
            }
            hint={fill(t.remaining, {
              amount: formatMoney(Math.max(0, total - (value.split.amount ?? 0))),
            })}
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() =>
          onChange(
            value.split
              ? { method: value.method, split: null }
              : {
                  method: value.method,
                  split: { method: otherMethod(value.method), amount: null },
                },
          )
        }
        className="self-start text-sm font-semibold text-cognac underline-offset-4 hover:underline"
      >
        {value.split ? t.unsplit : t.split}
      </button>
    </div>
  );
}
