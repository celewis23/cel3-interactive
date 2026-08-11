-- Meterwise integration: stores only the encrypted API key + base URL needed
-- to call Meterwise's API live. No Meterwise dashboard data is cached here.
CREATE TABLE IF NOT EXISTS meterwise_config (
  id                text PRIMARY KEY DEFAULT 'default',
  base_url          text NOT NULL,
  api_key_encrypted text NOT NULL,
  api_key_iv        text NOT NULL,
  connected_by      text,
  connected_at      timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
