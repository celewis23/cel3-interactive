import { randomUUID } from "crypto";
import crypto from "crypto";
import { sql } from "@/lib/postgres";

export const APP_TYPES = [
  "ClientAdminPortal",
  "WebsiteAdmin",
  "MobileApp",
  "Other",
] as const;
export type AppType = (typeof APP_TYPES)[number];

export const ALL_SCOPES = [
  "messaging:read",
  "messaging:write",
  "messaging:notifications:read",
  "messaging:notifications:write",
  "conversations:read",
  "conversations:write",
  "users:read:minimal",
] as const;
export type Scope = (typeof ALL_SCOPES)[number];

export interface ExternalAppIntegration {
  id: string;
  clientId: string;
  name: string;
  appType: AppType;
  portalUserId: string;
  portalUserEmail: string | null;
  allowedOrigins: string[];
  allowedRedirectUrls: string[] | null;
  scopes: string[];
  isActive: boolean;
  createdAt: string;
  createdByAdminId: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

type IntegrationRow = {
  id: string;
  client_id: string;
  client_secret_hash: string;
  client_secret_salt: string;
  name: string;
  app_type: string;
  portal_user_id: string;
  portal_user_email: string | null;
  allowed_origins: string | string[];
  allowed_redirect_urls: string | string[] | null;
  scopes: string | string[];
  is_active: boolean;
  created_at: string;
  created_by_admin_id: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
};

function parseJsonField<T>(val: unknown, fallback: T): T {
  if (Array.isArray(val)) return val as T;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch { return fallback; }
  }
  return fallback;
}

function mapRow(row: IntegrationRow): ExternalAppIntegration {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    appType: row.app_type as AppType,
    portalUserId: row.portal_user_id,
    portalUserEmail: row.portal_user_email,
    allowedOrigins: parseJsonField<string[]>(row.allowed_origins, []),
    allowedRedirectUrls: row.allowed_redirect_urls
      ? parseJsonField<string[]>(row.allowed_redirect_urls, [])
      : null,
    scopes: parseJsonField<string[]>(row.scopes, []),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    createdByAdminId: row.created_by_admin_id,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  };
}

// ---------------------------------------------------------------------------
// Credential helpers
// ---------------------------------------------------------------------------

function hashSecret(secret: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(secret, salt, 100_000, 64, "sha512")
    .toString("hex");
  return { hash, salt };
}

export function verifySecret(
  secret: string,
  hash: string,
  salt: string
): boolean {
  try {
    const derived = crypto
      .pbkdf2Sync(secret, salt, 100_000, 64, "sha512")
      .toString("hex");
    const a = Buffer.from(derived, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function generateClientId(): string {
  return "int_" + crypto.randomBytes(16).toString("hex");
}

function generateRawSecret(): string {
  return "sk_" + crypto.randomBytes(24).toString("hex");
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createIntegration(input: {
  name: string;
  appType: AppType;
  portalUserId: string;
  portalUserEmail: string | null;
  allowedOrigins: string[];
  allowedRedirectUrls: string[] | null;
  scopes: string[];
  createdByAdminId: string | null;
}): Promise<{ integration: ExternalAppIntegration; secret: string }> {
  const id = randomUUID();
  const clientId = generateClientId();
  const secret = generateRawSecret();
  const { hash, salt } = hashSecret(secret);

  await sql.query(
    `INSERT INTO external_app_integrations
     (id, client_id, client_secret_hash, client_secret_salt, name, app_type,
      portal_user_id, portal_user_email, allowed_origins, allowed_redirect_urls,
      scopes, is_active, created_at, created_by_admin_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,true,now(),$12)`,
    [
      id, clientId, hash, salt,
      input.name, input.appType,
      input.portalUserId, input.portalUserEmail,
      JSON.stringify(input.allowedOrigins),
      input.allowedRedirectUrls ? JSON.stringify(input.allowedRedirectUrls) : null,
      JSON.stringify(input.scopes),
      input.createdByAdminId,
    ]
  );

  const rows = await sql.query<IntegrationRow>(
    `SELECT * FROM external_app_integrations WHERE id = $1`,
    [id]
  );
  return { integration: mapRow(rows[0]), secret };
}

export async function listIntegrations(): Promise<ExternalAppIntegration[]> {
  const rows = await sql.query<IntegrationRow>(
    `SELECT * FROM external_app_integrations ORDER BY created_at DESC`
  );
  return rows.map(mapRow);
}

export async function getIntegrationByClientId(clientId: string): Promise<
  | (ExternalAppIntegration & { secretHash: string; secretSalt: string })
  | null
> {
  const rows = await sql.query<IntegrationRow>(
    `SELECT * FROM external_app_integrations WHERE client_id = $1 LIMIT 1`,
    [clientId]
  );
  if (!rows.length) return null;
  const row = rows[0];
  return {
    ...mapRow(row),
    secretHash: row.client_secret_hash,
    secretSalt: row.client_secret_salt,
  };
}

export async function getIntegrationById(id: string): Promise<ExternalAppIntegration | null> {
  const rows = await sql.query<IntegrationRow>(
    `SELECT * FROM external_app_integrations WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;
  return mapRow(rows[0]);
}

export async function revokeIntegration(id: string): Promise<void> {
  await sql.query(
    `UPDATE external_app_integrations
     SET is_active = false, revoked_at = now()
     WHERE id = $1`,
    [id]
  );
}

export async function regenerateSecret(id: string): Promise<string> {
  const secret = generateRawSecret();
  const { hash, salt } = hashSecret(secret);
  await sql.query(
    `UPDATE external_app_integrations
     SET client_secret_hash = $2, client_secret_salt = $3,
         last_used_at = NULL, revoked_at = NULL, is_active = true
     WHERE id = $1`,
    [id, hash, salt]
  );
  return secret;
}

export async function touchLastUsed(clientId: string): Promise<void> {
  await sql.query(
    `UPDATE external_app_integrations SET last_used_at = now() WHERE client_id = $1`,
    [clientId]
  ).catch(() => { /* fire-and-forget */ });
}
