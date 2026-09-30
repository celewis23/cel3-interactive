CREATE TABLE IF NOT EXISTS mockup_directory_attempts (
  bucket char(64) PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS mockup_directory_attempts_window_idx ON mockup_directory_attempts (window_start);
