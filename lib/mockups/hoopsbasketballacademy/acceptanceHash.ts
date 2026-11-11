// Server-only (uses node:crypto) — kept out of pricing.ts so that file stays safe to
// import from the client-side proposal page for the live price preview.
import { createHash } from "node:crypto";
import type { HoopsSelectionId } from "./config";

/** Stable hash of exactly what was quoted, recorded at acceptance and re-checked at fulfillment. */
export function hashHoopsAcceptance(input: {
  selectionId: HoopsSelectionId;
  addOn: boolean;
  dueTodayCents: number;
  monthlyCents: number;
  proposalVersion: string;
}): string {
  const canonical = JSON.stringify({
    selectionId: input.selectionId,
    addOn: input.addOn,
    dueTodayCents: input.dueTodayCents,
    monthlyCents: input.monthlyCents,
    proposalVersion: input.proposalVersion,
  });
  return createHash("sha256").update(canonical).digest("hex");
}
