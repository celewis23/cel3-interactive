CREATE TABLE IF NOT EXISTS email_templates (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text,
  html        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_updated ON email_templates (updated_at DESC);
