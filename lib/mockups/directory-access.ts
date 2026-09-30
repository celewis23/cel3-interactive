import { createHmac, timingSafeEqual } from "node:crypto";

export const DIRECTORY_COOKIE = "cel3_mockups_directory";
export const DIRECTORY_TTL_SECONDS = 8 * 60 * 60;

function configuration() {
  const code = process.env.MOCKUPS_DIRECTORY_CODE;
  const secret = process.env.MOCKUPS_DIRECTORY_SECRET;
  if (!code || !/^\d{4}$/.test(code) || !secret || secret.length < 32) {
    throw new Error("Mockup directory access is not configured");
  }
  return { code, secret };
}

export function checkDirectoryCode(value: string): boolean {
  const { code } = configuration();
  return /^\d{4}$/.test(value) && timingSafeEqual(Buffer.from(value), Buffer.from(code));
}

function signature(expires: string): string {
  const { code, secret } = configuration();
  return createHmac("sha256", secret).update(`mockup-directory:v1:${code}:${expires}`).digest("hex");
}

export function createDirectoryToken(now = Date.now()): string {
  const expires = String(Math.floor(now / 1000) + DIRECTORY_TTL_SECONDS);
  return `${expires}.${signature(expires)}`;
}

export function verifyDirectoryToken(token: string | undefined, now = Date.now()): boolean {
  try {
    if (!token || !/^\d{10}\.[a-f0-9]{64}$/.test(token)) return false;
    const [expires, supplied] = token.split(".");
    const current = Math.floor(now / 1000);
    if (Number(expires) <= current || Number(expires) > current + DIRECTORY_TTL_SECONDS) return false;
    return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(signature(expires), "hex"));
  } catch { return false; }
}
