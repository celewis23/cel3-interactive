-- Compressed history waits here until the external-drive collector verifies it.
CREATE TABLE IF NOT EXISTS activity_archive_batches (
  id text PRIMARY KEY,
  sha256 text NOT NULL,
  record_count integer NOT NULL CHECK (record_count > 0),
  first_at text,
  last_at text,
  archive_gzip bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_archive_batches_created_idx ON activity_archive_batches (created_at);
