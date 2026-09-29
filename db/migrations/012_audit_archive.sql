-- Routine no-work job checks move here before being removed from Sanity.
-- Preserve the full original document, including its revision, for recovery.
CREATE TABLE IF NOT EXISTS audit_event_archive (
  project_id text NOT NULL,
  dataset text NOT NULL,
  event_id text NOT NULL,
  revision text NOT NULL,
  document jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, dataset, event_id, revision)
);

CREATE INDEX IF NOT EXISTS audit_event_archive_archived_at
  ON audit_event_archive (archived_at);
