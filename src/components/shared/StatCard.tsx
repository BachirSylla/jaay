import type { ReactNode } from "react";
import { cn } from "cn";
import { Money, type MoneyProps } from "@/components/shared/Money";

type StatCardProps = {
  label: string;
  amount: number;
  sub?: ReactNode;
  /** `espresso` is reserved for key summaries (net profit, supplier balance). */
  variant?: "default" | "espresso";
  amountVariant?: MoneyProps["variant"];
  className?: string;
};

export function StatCard({
  label,
  amount,
  sub,
  variant = "default",
  amountVariant = "default",
  className,
}: StatCardProps) {
  const espresso = variant === "espresso";

  return (
    <div
      data-slot="stat-card"
      className={cn(
        "flex flex-col gap-2 p-5",
        espresso
          ? "rounded-3xl bg-espresso text-espresso-ink"
          : "rounded-2xl border border-line bg-surface text-ink",
        className,
      )}
    >
      <span
        className={cn(
          "text-[13px] font-medium",
          espresso ? "text-espresso-muted" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <Money
        amount={amount}
        size={espresso ? "hero" : "lg"}
        variant={espresso ? "default" : amountVariant}
        currencyClassName={espresso ? "text-gold" : undefined}
      />
      {sub ? (
        <span
          className={cn("text-[13px]", espresso ? "text-espresso-muted" : "text-muted-foreground")}
        >
          {sub}
        </span>
      ) : null}
    </div>
  );
}
