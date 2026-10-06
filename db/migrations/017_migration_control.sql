-- Temporary cutover gate used by the legacy deployment only.
CREATE TABLE IF NOT EXISTS app_migration_control (
  id text PRIMARY KEY,
  frozen boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO app_migration_control (id, frozen) VALUES ('sanity-cutover', false)
ON CONFLICT (id) DO NOTHING;
