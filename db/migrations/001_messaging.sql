CREATE TABLE IF NOT EXISTS messaging_conversations (
  id text PRIMARY KEY,
  title text,
  status text NOT NULL DEFAULT 'open',
  type text NOT NULL DEFAULT 'ClientSupport',
  client_id text,
  client_name text,
  client_email text,
  client_profile_image_url text,
  company text,
  stripe_customer_id text,
  pipeline_contact_id text,
  drive_folder_id text,
  created_by_actor_id text NOT NULL,
  created_by_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  last_sender_name text
);

CREATE INDEX IF NOT EXISTS messaging_conversations_client_idx
  ON messaging_conversations (client_id);

CREATE INDEX IF NOT EXISTS messaging_conversations_last_message_idx
  ON messaging_conversations (last_message_at DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS messaging_conversation_participants (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES messaging_conversations(id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  user_id text,
  participant_kind text NOT NULL,
  role_in_conversation text NOT NULL,
  display_name text NOT NULL,
  email text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_message_id text,
  last_read_at timestamptz,
  is_muted boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  UNIQUE (conversation_id, actor_id)
);

CREATE INDEX IF NOT EXISTS messaging_participants_actor_idx
  ON messaging_conversation_participants (actor_id);

CREATE TABLE IF NOT EXISTS messaging_messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES messaging_conversations(id) ON DELETE CASCADE,
  sender_actor_id text NOT NULL,
  sender_user_id text,
  sender_kind text NOT NULL,
  sender_name text NOT NULL,
  sender_email text,
  sender_avatar_url text,
  body text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'Text',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS messaging_messages_conversation_created_idx
  ON messaging_messages (conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS messaging_message_attachments (
  id text PRIMARY KEY,
  message_id text NOT NULL REFERENCES messaging_messages(id) ON DELETE CASCADE,
  conversation_id text NOT NULL REFERENCES messaging_conversations(id) ON DELETE CASCADE,
  drive_file_id text NOT NULL,
  file_name text NOT NULL,
  file_url text,
  web_view_link text,
  web_content_link text,
  thumbnail_link text,
  content_type text NOT NULL,
  size_bytes bigint,
  uploaded_by_actor_id text NOT NULL,
  uploaded_by_user_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messaging_attachments_message_idx
  ON messaging_message_attachments (message_id);

CREATE TABLE IF NOT EXISTS messaging_notifications (
  id text PRIMARY KEY,
  recipient_actor_id text NOT NULL,
  recipient_user_id text,
  recipient_kind text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  link_url text NOT NULL
);

CREATE INDEX IF NOT EXISTS messaging_notifications_recipient_created_idx
  ON messaging_notifications (recipient_actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messaging_notifications_unread_entity_idx
  ON messaging_notifications (recipient_actor_id, entity_id)
  WHERE is_read = false;
