-- Newsletter subscriber list (non-portal email contacts)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id                 text PRIMARY KEY,
  email              text NOT NULL UNIQUE,
  name               text,
  status             text NOT NULL DEFAULT 'active', -- active | unsubscribed
  unsubscribe_token  text NOT NULL UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at    timestamptz
);

-- Named groups for targeted sends
CREATE TABLE IF NOT EXISTS campaign_groups (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Group members: either a portal user (_id from Sanity) or a subscriber id
CREATE TABLE IF NOT EXISTS campaign_group_members (
  group_id    text NOT NULL REFERENCES campaign_groups(id) ON DELETE CASCADE,
  member_type text NOT NULL, -- 'portal_user' | 'subscriber'
  member_id   text NOT NULL,
  PRIMARY KEY (group_id, member_type, member_id)
);

-- Campaign/newsletter records
CREATE TABLE IF NOT EXISTS campaigns (
  id                  text PRIMARY KEY,
  title               text NOT NULL,       -- internal label
  subject             text NOT NULL,       -- email subject line
  body_html           text NOT NULL DEFAULT '',
  status              text NOT NULL DEFAULT 'draft', -- draft | scheduled | sending | sent | failed
  target_type         text NOT NULL DEFAULT 'all', -- all | portal_users | subscribers | group
  group_id            text,
  scheduled_at        timestamptz,
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by_admin_id text,
  sent_count          integer NOT NULL DEFAULT 0,
  open_count          integer NOT NULL DEFAULT 0,
  click_count         integer NOT NULL DEFAULT 0
);

-- Per-recipient send record (one row per email sent)
CREATE TABLE IF NOT EXISTS campaign_sends (
  id               text PRIMARY KEY,
  campaign_id      text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_email  text NOT NULL,
  recipient_name   text,
  recipient_type   text NOT NULL, -- 'portal_user' | 'subscriber'
  recipient_id     text NOT NULL,
  track_token      text NOT NULL UNIQUE,  -- used for open pixel, click tracking, and unsubscribe
  sent_at          timestamptz NOT NULL DEFAULT now(),
  opened_at        timestamptz,
  first_clicked_at timestamptz
);

-- Individual click events
CREATE TABLE IF NOT EXISTS campaign_clicks (
  id               text PRIMARY KEY,
  campaign_send_id text NOT NULL REFERENCES campaign_sends(id) ON DELETE CASCADE,
  url              text NOT NULL,
  clicked_at       timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status          ON campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled       ON campaigns (scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign   ON campaign_sends (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_token      ON campaign_sends (track_token);
CREATE INDEX IF NOT EXISTS idx_newsletter_subs_email     ON newsletter_subscribers (email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subs_status    ON newsletter_subscribers (status);
CREATE INDEX IF NOT EXISTS idx_group_members_group       ON campaign_group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_campaign_clicks_send      ON campaign_clicks (campaign_send_id);
