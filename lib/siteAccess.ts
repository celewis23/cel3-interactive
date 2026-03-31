import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export type SiteAccessFields = {
  siteUrl?: string | null;
  managementUrl?: string | null;
  managementUsername?: string | null;
  managementPassword?: string | null;
  managementPasswordEncrypted?: string | null;
  managementPasswordIv?: string | null;
};

const SECRET_SOURCE =
  process.env.SITE_ACCESS_SECRET
  ?? process.env.PORTAL_SESSION_SECRET
  ?? process.env.ADMIN_SESSION_SECRET
  ?? process.env.CRON_SECRET
  ?? "change-me-site-access-secret";

function getKey() {
  return createHash("sha256").update(SECRET_SOURCE).digest();
}

export function normalizeUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function encryptSitePassword(password: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: Buffer.concat([encrypted, tag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function decryptSitePassword(encrypted: string | null | undefined, iv: string | null | undefined) {
  if (!encrypted || !iv) return null;
  try {
    const raw = Buffer.from(encrypted, "base64");
    const authTag = raw.subarray(raw.length - 16);
    const body = raw.subarray(0, raw.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function buildSiteAccessPatch(input: SiteAccessFields) {
  const patch: Record<string, unknown> = {};

  if ("siteUrl" in input) patch.siteUrl = normalizeUrl(input.siteUrl);
  if ("managementUrl" in input) patch.managementUrl = normalizeUrl(input.managementUrl);
  if ("managementUsername" in input) patch.managementUsername = input.managementUsername?.trim() || null;

  if ("managementPassword" in input) {
    const trimmed = input.managementPassword?.trim() || "";
    if (trimmed) {
      const encrypted = encryptSitePassword(trimmed);
      patch.managementPasswordEncrypted = encrypted.encrypted;
      patch.managementPasswordIv = encrypted.iv;
    }
  }

  return patch;
}

export function getDecryptedManagementPassword(input: SiteAccessFields) {
  return decryptSitePassword(input.managementPasswordEncrypted, input.managementPasswordIv);
}

export function getManagementLaunchDetails(input: {
  siteUrl?: string | null;
  managementUrl?: string | null;
  managementUsername?: string | null;
  managementPasswordEncrypted?: string | null;
  managementPasswordIv?: string | null;
}) {
  const siteUrl = normalizeUrl(input.siteUrl);
  const managementUrl = normalizeUrl(input.managementUrl);
  const username = input.managementUsername?.trim() || null;
  const password = getDecryptedManagementPassword(input);
  const isWordPress = Boolean(
    managementUrl && /(wp-login\.php|\/wp-admin\/?$)/i.test(managementUrl)
  );

  let loginAction = managementUrl;
  if (managementUrl && /\/wp-admin\/?$/i.test(managementUrl)) {
    loginAction = managementUrl.replace(/\/wp-admin\/?$/i, "/wp-login.php");
  }

  return {
    siteUrl,
    managementUrl,
    managementUsername: username,
    managementPassword: password,
    isWordPress,
    loginAction,
  };
}
