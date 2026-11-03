CREATE TABLE IF NOT EXISTS messaging_message_reactions (
  message_id text NOT NULL REFERENCES messaging_messages(id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  emoji text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, actor_id, emoji)
);
