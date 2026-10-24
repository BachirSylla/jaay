import { cn } from "cn";
import { bagColorFor } from "@/lib/bag-colors";

/** Small round swatch of a bag color; dashed ring for the stock without color. */
export function ColorDot({ color, className }: { color: string | null; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-3 shrink-0 rounded-full",
        color === null
          ? "border border-dashed border-subtle"
          : cn("ring-1 ring-ink/15", bagColorFor(color).className),
        className,
      )}
    />
  );
}
