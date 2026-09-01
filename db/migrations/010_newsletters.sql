CREATE TABLE IF NOT EXISTS newsletters (
  id                    text PRIMARY KEY,
  title                 text NOT NULL,
  subject               text NOT NULL,
  summary               text,
  header_html           text NOT NULL DEFAULT '',
  body_html             text NOT NULL DEFAULT '',
  footer_html           text NOT NULL DEFAULT '',
  status                text NOT NULL DEFAULT 'draft', -- draft | publishing | published | sent | failed
  target_type           text NOT NULL DEFAULT 'portal_users', -- portal_users | group
  group_id              text REFERENCES campaign_groups(id) ON DELETE SET NULL,
  primary_color         text NOT NULL DEFAULT '#0ea5e9',
  accent_color          text NOT NULL DEFAULT '#111827',
  background_color      text NOT NULL DEFAULT '#f8fafc',
  text_color            text NOT NULL DEFAULT '#111827',
  font_family           text NOT NULL DEFAULT 'Inter, Arial, sans-serif',
  background_image_url  text,
  video_url             text,
  send_email            boolean NOT NULL DEFAULT false,
  published_at          timestamptz,
  emailed_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by_admin_id   text,
  portal_delivery_count integer NOT NULL DEFAULT 0,
  email_sent_count      integer NOT NULL DEFAULT 0,
  email_error_count     integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS newsletter_portal_deliveries (
  id             text PRIMARY KEY,
  newsletter_id  text NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  portal_user_id text NOT NULL,
  delivered_at   timestamptz NOT NULL DEFAULT now(),
  read_at        timestamptz,
  UNIQUE (newsletter_id, portal_user_id)
);

CREATE TABLE IF NOT EXISTS newsletter_email_sends (
  id              text PRIMARY KEY,
  newsletter_id   text NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  portal_user_id  text NOT NULL,
  recipient_email text NOT NULL,
  recipient_name  text,
  status          text NOT NULL DEFAULT 'sent', -- sent | failed
  error           text,
  sent_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters (status);
CREATE INDEX IF NOT EXISTS idx_newsletters_published ON newsletters (published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_newsletter_deliveries_user ON newsletter_portal_deliveries (portal_user_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_deliveries_newsletter ON newsletter_portal_deliveries (newsletter_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_email_sends_newsletter ON newsletter_email_sends (newsletter_id);
