CREATE TABLE IF NOT EXISTS mockups (
  slug       text PRIMARY KEY,
  name       text NOT NULL,
  status     text NOT NULL DEFAULT 'staged' CHECK (status IN ('staged', 'sent')),
  sent_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mockup_choices (
  id                 text PRIMARY KEY,
  mockup_slug        text NOT NULL REFERENCES mockups (slug) ON DELETE CASCADE,
  concept            text NOT NULL,
  contact_name       text NOT NULL,
  contact_email      text,
  contact_phone      text,
  notes              text,
  pipeline_contact_id text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mockup_choices_mockup_slug ON mockup_choices (mockup_slug, created_at DESC);

CREATE TABLE IF NOT EXISTS mockup_choice_attempts (
  bucket char(64) PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS mockup_choice_attempts_window_idx ON mockup_choice_attempts (window_start);

INSERT INTO mockups (slug, name) VALUES
  ('justbrunchva', 'Just Brunch'),
  ('electric-sun-society', 'Electric Sun Society'),
  ('neejah-styles', 'Najeeah Styles'),
  ('secret-squares', 'Secret Squares'),
  ('unlockingrva', 'UnlockingRVA'),
  ('frith-yorkies', 'Frith Yorkies & More'),
  ('glue-craft-studio', 'Glue Craft Studio'),
  ('youmatterrva', 'You Matter Juice Bar & More'),
  ('enrich-her-wellness', 'Enrich Her Wellness'),
  ('ej-piano', 'E&J Piano and Music Studio')
ON CONFLICT (slug) DO NOTHING;
