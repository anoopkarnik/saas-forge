/**
 * What credits are spent on (billing module). The Usage page shows this table
 * so charges are explainable. Add a meter here, inside its module's markers,
 * before calling recordUsage() with it.
 */
export type MeterDefinition = {
  label: string;
  /** What `quantity` counts. */
  unit: string;
  /** How a quantity becomes credits, as shown to users. */
  rate: string;
};

export const METERS = {
  // scaffold:begin ai
  "ai.tokens": {
    label: "AI chat",
    unit: "tokens",
    rate: "1 credit per 1,000 tokens, at least 1 per reply",
  },
  // scaffold:end ai
} satisfies Record<string, MeterDefinition>;

export type MeterId = keyof typeof METERS;

/** A label for any meter, including ones recorded by code outside this registry. */
export function meterLabel(meter: string): string {
  const known = (METERS as Record<string, MeterDefinition>)[meter];
  if (known) return known.label;
  const words = meter.replace(/[._]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
