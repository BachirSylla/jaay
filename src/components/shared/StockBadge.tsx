import { cn } from "cn";

export function StockBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full bg-danger-soft px-2.5 text-xs font-semibold text-danger",
        className,
      )}
    >
      {label}
    </span>
  );
}
