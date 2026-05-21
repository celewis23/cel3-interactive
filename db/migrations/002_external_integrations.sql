-- External app integrations: allows third-party client admin consoles to
-- authenticate and access the messaging system on behalf of a portal user.

CREATE TABLE IF NOT EXISTS external_app_integrations (
  id                  text PRIMARY KEY,
  client_id           text NOT NULL UNIQUE,          -- public key, safe to share
  client_secret_hash  text NOT NULL,                 -- PBKDF2-SHA512 hash
  client_secret_salt  text NOT NULL,                 -- salt for the hash
  name                text NOT NULL,
  app_type            text NOT NULL DEFAULT 'ClientAdminPortal',
  portal_user_id      text NOT NULL,                 -- Sanity clientPortalUser._id
  portal_user_email   text,
  allowed_origins     jsonb NOT NULL DEFAULT '[]',   -- ["https://example.com"]
  allowed_redirect_urls jsonb,
  scopes              jsonb NOT NULL DEFAULT '[]',   -- ["messaging:read", ...]
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by_admin_id text,
  last_used_at        timestamptz,
  revoked_at          timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ext_integrations_client_id
  ON external_app_integrations (client_id);

CREATE INDEX IF NOT EXISTS idx_ext_integrations_portal_user
  ON external_app_integrations (portal_user_id);

CREATE INDEX IF NOT EXISTS idx_ext_integrations_active
  ON external_app_integrations (is_active);

-- Audit log: tracks every external API call for security and debugging.
CREATE TABLE IF NOT EXISTS external_app_audit_log (
  id              text PRIMARY KEY,
  integration_id  text NOT NULL,
  client_id       text NOT NULL,
  endpoint        text,
  method          text,
  status_code     integer,
  success         boolean NOT NULL DEFAULT true,
  portal_user_id  text,
  requester_ip    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ext_audit_integration
  ON external_app_audit_log (integration_id);

CREATE INDEX IF NOT EXISTS idx_ext_audit_created
  ON external_app_audit_log (created_at DESC);
