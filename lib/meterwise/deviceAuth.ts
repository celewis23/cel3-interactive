import { createHash, createHmac, randomBytes } from "crypto";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { OWNER_CREDENTIALS_ID } from "@/lib/admin/ownerPassword";
import type { SessionPayload } from "@/lib/admin/auth";

type Credential = { status?: string; roleSlug?: string; passwordHash?: string; passwordSalt?: string; passwordChangedAt?: string };
type Device = { _id: string; staffId: string | null; version: string; revoked: boolean };
const idFor = (token: string) => `meterwiseDevice.${createHash("sha256").update(token).digest("hex")}`;

async function credentials(staffId?: string | null) {
  return sanityServer.fetch<Credential | null>(
    `*[_id == $id][0]{ status, roleSlug, passwordHash, passwordSalt, passwordChangedAt }`,
    { id: staffId || OWNER_CREDENTIALS_ID },
  );
}

function version(staffId: string | null, credential: Credential | null) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is required for device sign-in");
  return createHmac("sha256", secret).update(JSON.stringify([
    staffId, credential?.passwordHash, credential?.passwordSalt, credential?.passwordChangedAt,
    staffId ? null : process.env.ADMIN_USERNAME,
    staffId || credential?.passwordHash ? null : process.env.ADMIN_PASSWORD,
    staffId ? null : process.env.ADMIN_PIN,
  ])).digest("hex");
}

async function canView(staffId: string | null, credential: Credential | null) {
  if (!staffId) return true;
  if (credential?.status !== "active" || !credential.passwordHash || !credential.roleSlug) return false;
  const role = await sanityServer.fetch<{ permissions?: { meterwise?: { view?: boolean } } } | null>(
    `*[_type == "staffRole" && slug == $slug][0]{ permissions }`, { slug: credential.roleSlug },
  );
  return role?.permissions?.meterwise?.view === true;
}

/** Device credentials have no idle expiry; every request checks current account credentials and permissions. */
export async function createDevice(session: SessionPayload, expectedVersion?: string) {
  if (session.step !== "full") return null;
  const staffId = session.staffId ?? null;
  const credential = await credentials(staffId);
  if (!await canView(staffId, credential)) return null;
  if (expectedVersion && expectedVersion !== version(staffId, credential)) return null;
  // A browser session established before a password change must sign in again.
  if (credential?.passwordChangedAt && session.iat <= Date.parse(credential.passwordChangedAt)) return null;
  const token = randomBytes(32).toString("hex");
  await sanityWriteClient.create({
    _id: idFor(token), _type: "meterwiseDevice", staffId,
    version: version(staffId, credential), revoked: false, createdAt: new Date().toISOString(),
  });
  return token;
}

export async function verifyDevice(authorization: string | null): Promise<Device | null> {
  const token = /^Bearer ([a-f0-9]{64})$/.exec(authorization ?? "")?.[1];
  if (!token) return null;
  const device = await sanityServer.fetch<Device | null>(
    `*[_type == "meterwiseDevice" && _id == $id][0]{ _id, staffId, version, revoked }`, { id: idFor(token) },
  );
  if (!device || device.revoked) return null;
  const credential = await credentials(device.staffId);
  if (device.version !== version(device.staffId, credential) || !await canView(device.staffId, credential)) return null;
  return device;
}

export async function revokeDevice(id: string) {
  await sanityWriteClient.patch(id).set({ revoked: true }).commit();
}

type Pairing = { _id: string; _rev: string; staffId: string | null; version: string; challenge: string; authorizedAt: number; expiresAt: number; consumed: boolean };
const pairingId = (code: string) => `meterwisePairing.${createHash("sha256").update(code).digest("hex")}`;

/** Browser-to-app handoff: five-minute, one-time code bound to the app's random verifier. */
export async function createPairing(session: SessionPayload, challenge: string) {
  if (session.step !== "full" || !/^[a-f0-9]{64}$/.test(challenge)) return null;
  const staffId = session.staffId ?? null;
  const credential = await credentials(staffId);
  if (!await canView(staffId, credential)) return null;
  if (credential?.passwordChangedAt && session.iat <= Date.parse(credential.passwordChangedAt)) return null;
  const code = randomBytes(32).toString("hex");
  await sanityWriteClient.create({ _id: pairingId(code), _type: "meterwisePairing", staffId,
    version: version(staffId, credential), challenge, authorizedAt: session.iat,
    expiresAt: Date.now() + 5 * 60_000, consumed: false });
  return code;
}

export async function redeemPairing(code: string, verifier: string) {
  if (!/^[a-f0-9]{64}$/.test(code) || !/^[a-f0-9]{64}$/.test(verifier)) return null;
  const pairing = await sanityServer.fetch<Pairing | null>(
    `*[_type == "meterwisePairing" && _id == $id][0]`, { id: pairingId(code) });
  if (!pairing || pairing.consumed || Date.now() >= pairing.expiresAt ||
      createHash("sha256").update(verifier).digest("hex") !== pairing.challenge) return null;
  // Revision check makes concurrent redemption fail atomically in the document store.
  try { await sanityWriteClient.patch(pairing._id).ifRevisionId(pairing._rev).set({ consumed: true }).commit(); }
  catch (error) {
    if ((error as { statusCode?: number }).statusCode === 409) return null;
    throw error;
  }
  return createDevice({ step: "full", staffId: pairing.staffId ?? undefined, iat: pairing.authorizedAt, exp: pairing.expiresAt }, pairing.version);
}
