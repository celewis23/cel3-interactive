import { JUICEBOX_SELECTIONS, type JuiceboxSelectionId } from "./config";

export class JuiceboxPricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JuiceboxPricingError";
  }
}

export type JuiceboxPriceQuote = {
  selectionId: JuiceboxSelectionId;
  dueTodayCents: number;
  monthlyCents: number;
  lineItemName: string;
};

/** The only place a selection turns into dollar amounts. Never trust these from the browser. */
export function quoteJuiceboxSelection(selectionId: unknown): JuiceboxPriceQuote {
  if (typeof selectionId !== "string" || !(selectionId in JUICEBOX_SELECTIONS)) {
    throw new JuiceboxPricingError("Unknown selection.");
  }
  const selection = JUICEBOX_SELECTIONS[selectionId as JuiceboxSelectionId];
  return {
    selectionId: selection.id,
    dueTodayCents: selection.dueTodayCents,
    monthlyCents: selection.monthlyCents,
    lineItemName: selection.lineItemName,
  };
}

export const JUICEBOX_PROPOSAL_VERSION = "2026-11-14";
