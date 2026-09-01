CREATE TABLE IF NOT EXISTS newsletter_templates (
  id                    text PRIMARY KEY,
  name                  text NOT NULL,
  description           text,
  header_html           text NOT NULL DEFAULT '',
  body_html             text NOT NULL DEFAULT '',
  footer_html           text NOT NULL DEFAULT '',
  primary_color         text NOT NULL DEFAULT '#0ea5e9',
  accent_color          text NOT NULL DEFAULT '#111827',
  background_color      text NOT NULL DEFAULT '#f8fafc',
  text_color            text NOT NULL DEFAULT '#111827',
  font_family           text NOT NULL DEFAULT 'Inter, Arial, sans-serif',
  background_image_url  text,
  video_url             text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_templates_updated ON newsletter_templates (updated_at DESC);

INSERT INTO newsletter_templates (
  id, name, description, header_html, body_html, footer_html,
  primary_color, accent_color, background_color, text_color, font_family
) VALUES
(
  'monthly-update',
  'Monthly update',
  'A reusable client update with highlights and next steps.',
  '<p style="margin:0;font-size:13px;letter-spacing:.16em;text-transform:uppercase;opacity:.75;">Client Newsletter</p><h1 style="margin:8px 0 0;font-size:30px;line-height:1.15;">Monthly project notes</h1>',
  '<h2>Highlights</h2><p>Share the most important updates, wins, and next steps for your clients.</p><h2>What is next</h2><p>Add the work clients should expect to see next.</p>',
  '<p style="margin:0;font-weight:700;">CEL3 Interactive</p><p style="margin:6px 0 0;opacity:.75;">Built for clients, operators, and teams moving work forward.</p>',
  '#0ea5e9',
  '#111827',
  '#f8fafc',
  '#111827',
  'Inter, Arial, sans-serif'
),
(
  'launch-note',
  'Launch note',
  'A release announcement template for new work going live.',
  '<p style="margin:0;font-size:13px;letter-spacing:.16em;text-transform:uppercase;opacity:.75;">Launch Update</p><h1 style="margin:8px 0 0;font-size:30px;line-height:1.15;">A new release is live</h1>',
  '<h2>What changed</h2><p>Describe the release and why it matters.</p><h2>How to use it</h2><p>Give clients a direct next action.</p>',
  '<p style="margin:0;font-weight:700;">Questions?</p><p style="margin:6px 0 0;opacity:.75;">Reply to this email or message us from your portal.</p>',
  '#0ea5e9',
  '#111827',
  '#f8fafc',
  '#111827',
  'Inter, Arial, sans-serif'
),
(
  'resource-roundup',
  'Resource roundup',
  'A curated issue for helpful links, ideas, and featured resources.',
  '<p style="margin:0;font-size:13px;letter-spacing:.16em;text-transform:uppercase;opacity:.75;">Resource Roundup</p><h1 style="margin:8px 0 0;font-size:30px;line-height:1.15;">Useful links and ideas</h1>',
  '<h2>Recommended reading</h2><ul><li>Add a helpful article or guide.</li><li>Add a product, process, or training note.</li></ul><h2>Featured resource</h2><p>Highlight one thing clients should not miss.</p>',
  '<p style="margin:0;font-weight:700;">CEL3 Interactive</p><p style="margin:6px 0 0;opacity:.75;">More resources are available in your client portal.</p>',
  '#0ea5e9',
  '#111827',
  '#f8fafc',
  '#111827',
  'Inter, Arial, sans-serif'
)
ON CONFLICT (id) DO NOTHING;
