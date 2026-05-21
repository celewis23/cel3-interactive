import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import type { MessagingActor } from "@/lib/messaging/auth";

// Derived secret so integrations use a separate signing key from admin sessions.
const SECRET =
  process.env.INTEGRATION_TOKEN_SECRET ??
  (process.env.ADMIN_SESSION_SECRET ?? "fallback_change_me") + "_int";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export type IntegrationTokenPayload = {
  integrationId: string;
  clientId: string;
  portalUserId: string;
  scopes: string[];
  iat: number;
  exp: number;
};

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("hex");
}

export function createIntegrationToken(
  integrationId: string,
  clientId: string,
  portalUserId: string,
  scopes: string[]
): string {
  const payload: IntegrationTokenPayload = {
    integrationId,
    clientId,
    portalUserId,
    scopes,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(data);
  return `${data}.${sig}`;
}

export function verifyIntegrationToken(
  token: string
): IntegrationTokenPayload | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expected = sign(data);
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    const payload: IntegrationTokenPayload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    );
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function extractBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export function hasScope(payload: IntegrationTokenPayload, scope: string): boolean {
  return payload.scopes.includes(scope);
}

type PortalRecord = {
  _id: string;
  email: string;
  name: string | null;
  company: string | null;
  stripeCustomerId: string | null;
  pipelineContactId: string | null;
  profileImageUrl?: string | null;
  status: string;
};

export async function resolveActorFromToken(
  payload: IntegrationTokenPayload
): Promise<MessagingActor | null> {
  const user = await sanityServer
    .fetch<PortalRecord | null>(
      `*[_type == "clientPortalUser" && _id == $id && status != "suspended"][0]{
        _id, email, name, company, stripeCustomerId, pipelineContactId, profileImageUrl, status
      }`,
      { id: payload.portalUserId }
    )
    .catch(() => null);

  if (!user) return null;

  return {
    kind: "client",
    actorId: `portal:${user._id}`,
    userId: user._id,
    name: user.name ?? user.company ?? user.email,
    email: user.email,
    company: user.company,
    stripeCustomerId: user.stripeCustomerId,
    pipelineContactId: user.pipelineContactId,
    avatarUrl: user.profileImageUrl ?? null,
  };
}
