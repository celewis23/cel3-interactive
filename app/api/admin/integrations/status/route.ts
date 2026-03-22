export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getStoredTokens } from "@/lib/gmail/client";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "view");
  if (authErr) return authErr;

  const [googleStatus, stripeStatus] = await Promise.all([
    checkGoogle(),
    checkStripe(),
  ]);

  return NextResponse.json({ google: googleStatus, stripe: stripeStatus });
}

async function checkGoogle() {
  try {
    const tokens = await getStoredTokens();
    if (!tokens) return { connected: false };

    // Check if token is expired (with 60s buffer)
    const expired = tokens.expiry_date && tokens.expiry_date < Date.now() + 60_000;

    // Ping Gmail profile for a live health check
    let healthy = false;
    let lastError: string | null = null;
    try {
      const { getProfile } = await import("@/lib/gmail/api");
      await getProfile();
      healthy = true;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Connection check failed";
    }

    return {
      connected: true,
      email: tokens.email,
      connectedAt: tokens.connectedAt,
      tokenExpiry: tokens.expiry_date,
      expired: !!expired,
      healthy,
      lastError,
    };
  } catch (err) {
    return {
      connected: false,
      healthy: false,
      lastError: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { connected: false };

  const mode = key.startsWith("sk_live") ? "live" : "test";

  let healthy = false;
  let accountName: string | null = null;
  let lastError: string | null = null;

  try {
    const { getBalance } = await import("@/lib/stripe/billing");
    await getBalance();
    healthy = true;

    // Try to get account name
    try {
      const { stripe } = await import("@/lib/stripe");
      const account = await stripe.accounts.retrieve();
      accountName = account.business_profile?.name ?? account.email ?? null;
    } catch { /* non-critical */ }
  } catch (err) {
    lastError = err instanceof Error ? err.message : "Stripe connection failed";
  }

  return {
    connected: true,
    mode,
    accountName,
    healthy,
    lastError,
    keyPrefix: key.slice(0, 12) + "…",
  };
}
