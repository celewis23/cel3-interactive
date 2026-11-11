import { HOOPS_SELECTIONS, type HoopsSelectionId } from "./config";

export class HoopsPricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HoopsPricingError";
  }
}

export type HoopsPriceQuote = {
  selectionId: HoopsSelectionId;
  addOn: boolean;
  dueTodayCents: number;
  monthlyCents: number;
  lineItemName: string;
};

/** The only place selection + add-on turn into dollar amounts. Never trust these from the browser. */
export function quoteHoopsSelection(selectionId: unknown, addOnRequested: unknown): HoopsPriceQuote {
  if (typeof selectionId !== "string" || !(selectionId in HOOPS_SELECTIONS)) {
    throw new HoopsPricingError("Unknown selection.");
  }
  const selection = HOOPS_SELECTIONS[selectionId as HoopsSelectionId];
  const addOnRequestedBool = addOnRequested === true;
  if (addOnRequestedBool && !selection.addOnAllowed && !selection.addOnIncluded) {
    throw new HoopsPricingError(`The visual site editor add-on isn't available with ${selection.name}.`);
  }
  const addOn = selection.addOnIncluded || addOnRequestedBool;
  const addOnCharge = selection.addOnIncluded ? 0 : addOnRequestedBool ? selection.addOnPriceCents : 0;

  return {
    selectionId: selection.id,
    addOn,
    dueTodayCents: selection.dueTodayCents + addOnCharge,
    monthlyCents: selection.monthlyCents,
    lineItemName: selection.lineItemName,
  };
}

export const HOOPS_PROPOSAL_VERSION = "2026-11-11";
