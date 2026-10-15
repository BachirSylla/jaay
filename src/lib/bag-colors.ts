/** Thumbnail colors for products without photo (DESIGN.md §2). */
export const BAG_COLORS = [
  { key: "black", label: "Noir", className: "bg-bag-black", keywords: ["noir", "black"] },
  {
    key: "brown",
    label: "Marron",
    className: "bg-bag-brown",
    keywords: ["marron", "brun", "chocolat", "cognac", "brown"],
  },
  {
    key: "caramel",
    label: "Caramel",
    className: "bg-bag-caramel",
    keywords: ["caramel", "camel", "fauve"],
  },
  {
    key: "sand",
    label: "Sable",
    className: "bg-bag-sand",
    keywords: ["sable", "beige", "crème", "creme", "blanc", "écru", "ecru", "nude"],
  },
  {
    key: "navy",
    label: "Bleu nuit",
    className: "bg-bag-navy",
    keywords: ["bleu", "marine", "nuit", "navy"],
  },
] as const;

export type BagColor = (typeof BAG_COLORS)[number];

/** Picks the thumbnail color from the free-text color of the product ("Noir mat" → black). */
export function bagColorFor(color: string | null | undefined): BagColor {
  const value = (color ?? "").toLowerCase();
  return BAG_COLORS.find((c) => c.keywords.some((k) => value.includes(k))) ?? BAG_COLORS[1];
}

/** Light colors need a dark icon. */
export function isLightBag(color: BagColor): boolean {
  return color.key === "sand" || color.key === "caramel";
}
