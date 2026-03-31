import { createHmac, timingSafeEqual, randomBytes } from "crypto";

const SECRET =
  process.env.PORTAL_SESSION_SECRET ??
  ((process.env.ADMIN_SESSION_SECRET ?? "change-me") + "_portal");

export const PORTAL_COOKIE = "cel3_portal_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type PortalSession = {
  userId: string;
  email: string;
  exp: number;
};

export function createPortalSessionToken(userId: string, email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, email, exp: Date.now() + SESSION_TTL_MS })
  ).toString("base64");
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyPortalSessionToken(token: string): PortalSession | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = createHmac("sha256", SECRET).update(payload).digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const sigBuf = Buffer.from(sig, "hex");
    if (expectedBuf.length !== sigBuf.length) return null;
    if (!timingSafeEqual(expectedBuf, sigBuf)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64").toString()) as PortalSession;
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function generateMagicToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateTemporaryPortalPassword(length = 14): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += alphabet[bytes[i] % alphabet.length];
  }
  return password;
}
