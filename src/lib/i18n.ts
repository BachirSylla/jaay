/** fill("Vente n° {n}", { n: 43 }) → "Vente n° 43". */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

const pluralRules = new Intl.PluralRules("fr-FR");

/** plural(1, { one: "{n} vente", other: "{n} ventes" }) → "1 vente". */
export function plural(n: number, forms: { one: string; other: string }): string {
  return fill(pluralRules.select(n) === "one" ? forms.one : forms.other, { n });
}
