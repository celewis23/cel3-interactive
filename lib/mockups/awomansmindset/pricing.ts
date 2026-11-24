import { AWM_SELECTIONS, type AwmSelectionId } from "./config";

export class AwmPricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AwmPricingError";
  }
}

export type AwmPriceQuote = {
  selectionId: AwmSelectionId;
  dueTodayCents: number;
  monthlyCents: number;
  oneTimeOnly: boolean;
  lineItemName: string;
};

/** The only place a selection turns into dollar amounts. Never trust these from the browser. */
export function quoteAwmSelection(selectionId: unknown): AwmPriceQuote {
  if (typeof selectionId !== "string" || !(selectionId in AWM_SELECTIONS)) {
    throw new AwmPricingError("Unknown selection.");
  }
  const selection = AWM_SELECTIONS[selectionId as AwmSelectionId];
  return {
    selectionId: selection.id,
    dueTodayCents: selection.dueTodayCents,
    monthlyCents: selection.monthlyCents,
    oneTimeOnly: selection.oneTimeOnly,
    lineItemName: selection.lineItemName,
  };
}

export const AWM_PROPOSAL_VERSION = "2026-11-23";
