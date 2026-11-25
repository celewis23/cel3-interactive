CREATE TABLE IF NOT EXISTS riversiderally_reports (
  id text PRIMARY KEY,
  report_type text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  road_label text,
  direction text,
  description text,
  status text NOT NULL DEFAULT 'active',
  confirm_count integer NOT NULL DEFAULT 0,
  dismiss_count integer NOT NULL DEFAULT 0,
  reporter_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_confirmed_at timestamptz
);

CREATE INDEX IF NOT EXISTS riversiderally_reports_active_idx
  ON riversiderally_reports (status, expires_at);

CREATE INDEX IF NOT EXISTS riversiderally_reports_location_idx
  ON riversiderally_reports (lat, lon);

CREATE INDEX IF NOT EXISTS riversiderally_reports_reporter_idx
  ON riversiderally_reports (reporter_hash, created_at DESC);
