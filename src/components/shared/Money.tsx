import { cn } from "cn";
import { formatMoney, formatMoneyParts } from "@/lib/format";

const sizeClasses = {
  sm: "text-sm font-semibold",
  md: "font-display text-base font-bold",
  lg: "font-display text-[22px] font-bold tracking-[-0.5px]",
  hero: "font-display text-[38px] leading-none font-bold tracking-[-1px] sm:text-[42px]",
} as const;

const variantClasses = {
  default: "",
  positive: "text-emerald",
  negative: "text-danger",
} as const;

export type MoneyProps = {
  /** Integer amount in FCFA. */
  amount: number;
  size?: keyof typeof sizeClasses;
  variant?: keyof typeof variantClasses;
  /** Prefixes positive amounts with "+". */
  signed?: boolean;
  className?: string;
  /** Classes for the "F" suffix (e.g. gold on espresso cards). */
  currencyClassName?: string;
};

export function Money({
  amount,
  size = "md",
  variant = "default",
  signed = false,
  className,
  currencyClassName,
}: MoneyProps) {
  const { value, currency } = formatMoneyParts(amount);
  const sign = signed && amount > 0 ? "+" : "";

  return (
    <span
      data-slot="money"
      aria-label={`${sign}${formatMoney(amount)}`}
      className={cn(
        "whitespace-nowrap tabular-nums",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
    >
      <span aria-hidden="true">
        {sign}
        {value}
        {" "}
        <span className={cn(size === "hero" && "text-[0.5em]", currencyClassName)}>{currency}</span>
      </span>
    </span>
  );
}
