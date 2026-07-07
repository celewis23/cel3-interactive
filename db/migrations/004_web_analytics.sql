-- First-party website analytics (pageviews + custom events)
CREATE TABLE IF NOT EXISTS web_events (
  id            text PRIMARY KEY,
  event_type    text NOT NULL DEFAULT 'pageview', -- pageview | event
  event_name    text,
  path          text NOT NULL,
  referrer      text,
  referrer_host text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  visitor_id    text NOT NULL, -- sha256(day + ip + ua + salt); no cookies stored
  session_id    text NOT NULL,
  country       text,          -- ISO 3166-1 alpha-2 from edge geo headers
  region        text,
  city          text,
  device        text,          -- Desktop | Mobile | Tablet
  browser       text,
  os            text,
  screen_w      integer,
  duration_sec  integer,       -- filled in by the exit beacon
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_events_created_idx ON web_events (created_at DESC);
CREATE INDEX IF NOT EXISTS web_events_type_created_idx ON web_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS web_events_session_idx ON web_events (session_id);
