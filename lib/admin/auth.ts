import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.ADMIN_SESSION_SECRET || "fallback_secret_change_me";
const COOKIE_NAME = "cel3_admin_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type SessionPayload = {
  step: "partial" | "full";
  iat: number;
  exp: number;
};

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("hex");
}

export function createSessionToken(step: "partial" | "full"): string {
  const payload: SessionPayload = {
    step,
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const sig = sign(data);
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expected = sign(data);
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    const payload: SessionPayload = JSON.parse(
      Buffer.from(data, "base64").toString("utf8")
    );
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function validateCredentials(username: string, password: string): boolean {
  const u = process.env.ADMIN_USERNAME || "";
  const p = process.env.ADMIN_PASSWORD || "";
  return username === u && password === p;
}

export function validatePin(pin: string): boolean {
  const expected = process.env.ADMIN_PIN || "";
  return pin === expected;
}

export { COOKIE_NAME };
