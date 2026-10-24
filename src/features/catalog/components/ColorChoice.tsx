"use client";

import { cn } from "cn";
import { ColorDot } from "@/components/shared/ColorDot";
import { fill } from "@/lib/i18n";
import { fr } from "@/messages/fr";
import type { ColorOption } from "../variants";

const t = fr.variants;

/**
 * Pick the color of a line (reception, sale, return). Colors already taken by another line
 * of the same model are disabled; with `showStock`, each chip shows the bags left.
 */
export function ColorChoice({
  label,
  options,
  value,
  onValueChange,
  takenKeys = [],
  showStock = false,
  invalid = false,
}: {
  label: string;
  options: ColorOption[];
  value: string;
  onValueChange: (key: string) => void;
  takenKeys?: string[];
  showStock?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const checked = option.key === value;
          const taken = !checked && takenKeys.includes(option.key);
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={taken}
              onClick={() => onValueChange(option.key)}
              className={cn(
                "relative inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors duration-150 ease-out after:absolute after:inset-x-0 after:-inset-y-1 disabled:opacity-40",
                checked
                  ? "border-ink bg-ink text-ground"
                  : "border-line bg-surface hover:bg-surface-muted",
                invalid && !checked && "border-danger",
              )}
            >
              <ColorDot color={option.color} />
              {showStock
                ? fill(t.inStock, { color: option.label, n: option.available })
                : option.label}
            </button>
          );
        })}
      </div>
      {invalid ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {t.choose}
        </p>
      ) : null}
    </div>
  );
}
