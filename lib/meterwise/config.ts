import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { sql } from "@/lib/postgres";

const SECRET_SOURCE =
  process.env.SITE_ACCESS_SECRET
  ?? process.env.ADMIN_SESSION_SECRET
  ?? process.env.CRON_SECRET
  ?? "change-me-site-access-secret";

function getKey() {
  return createHash("sha256").update(SECRET_SOURCE).digest();
}

function encryptApiKey(apiKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: Buffer.concat([encrypted, tag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

function decryptApiKey(encrypted: string, iv: string): string | null {
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

function maskKey(apiKey: string) {
  if (apiKey.length <= 8) return "••••";
  return `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`;
}

type ConfigRow = {
  base_url: string;
  api_key_encrypted: string;
  api_key_iv: string;
  connected_by: string | null;
  connected_at: string;
};

export interface MeterwiseConfig {
  baseUrl: string;
  apiKey: string;
}

export interface MeterwiseConfigStatus {
  configured: boolean;
  baseUrl?: string;
  keyMasked?: string;
  connectedAt?: string;
}

async function fetchRow(): Promise<ConfigRow | null> {
  const rows = await sql.query<ConfigRow>(
    `SELECT base_url, api_key_encrypted, api_key_iv, connected_by, connected_at
     FROM meterwise_config WHERE id = 'default' LIMIT 1`
  );
  return rows[0] ?? null;
}

/** Server-only: returns the decrypted API key + base URL for making live requests. */
export async function getMeterwiseConfig(): Promise<MeterwiseConfig | null> {
  const row = await fetchRow();
  if (!row) return null;
  const apiKey = decryptApiKey(row.api_key_encrypted, row.api_key_iv);
  if (!apiKey) return null;
  return { baseUrl: row.base_url, apiKey };
}

/** Safe to return to the client — never includes the plaintext key. */
export async function getMeterwiseConfigStatus(): Promise<MeterwiseConfigStatus> {
  const row = await fetchRow();
  if (!row) return { configured: false };
  const apiKey = decryptApiKey(row.api_key_encrypted, row.api_key_iv);
  if (!apiKey) return { configured: false };
  return {
    configured: true,
    baseUrl: row.base_url,
    keyMasked: maskKey(apiKey),
    connectedAt: row.connected_at,
  };
}

export async function saveMeterwiseConfig(input: {
  baseUrl: string;
  apiKey: string;
  connectedBy: string | null;
}): Promise<void> {
  const { encrypted, iv } = encryptApiKey(input.apiKey);
  await sql.query(
    `INSERT INTO meterwise_config (id, base_url, api_key_encrypted, api_key_iv, connected_by, connected_at, updated_at)
     VALUES ('default', $1, $2, $3, $4, now(), now())
     ON CONFLICT (id) DO UPDATE SET
       base_url = $1, api_key_encrypted = $2, api_key_iv = $3,
       connected_by = $4, updated_at = now()`,
    [input.baseUrl, encrypted, iv, input.connectedBy]
  );
}

export async function clearMeterwiseConfig(): Promise<void> {
  await sql.query(`DELETE FROM meterwise_config WHERE id = 'default'`);
}
