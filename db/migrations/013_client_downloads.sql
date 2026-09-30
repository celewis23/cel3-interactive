-- Archives stay in private storage, never in public/ or the source repository.
CREATE TABLE IF NOT EXISTS client_download_packages (
  slug text PRIMARY KEY,
  filename text NOT NULL,
  archive_base64 text NOT NULL,
  sha256 char(64) NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 4000000),
  code_hash char(64) NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_download_attempts (
  bucket char(64) PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS client_download_attempts_window_idx ON client_download_attempts (window_start);
