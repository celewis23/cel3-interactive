-- The ID and checksum share one bound parameter in the archive transaction.
-- Keep both columns text so PostgreSQL can infer that parameter consistently.
ALTER TABLE activity_archive_batches
  ALTER COLUMN sha256 TYPE text USING sha256::text;
