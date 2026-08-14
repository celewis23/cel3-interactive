-- First-party Tasks + Reminders (replaces the Google Tasks proxy).
-- Tasks push daily at notify_time until completed; reminders push once at remind_at.
CREATE TABLE IF NOT EXISTS task_items (
  id                 text PRIMARY KEY,
  kind               text NOT NULL CHECK (kind IN ('task','reminder')),
  title              text NOT NULL,
  notes              text,
  status             text NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed')),
  due_date           date,                -- tasks only, informational
  notify_time        text,                -- 'HH:mm' local time, tasks only, default '09:00'
  remind_at          timestamptz,         -- reminders only, absolute fire time
  keep_until_cleared boolean NOT NULL DEFAULT true,
  last_notified_date date,                -- tasks: last local date a push fired (dedupe within a day)
  last_notified_at   timestamptz,         -- reminders: when the one-time push fired
  created_by         text,
  completed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_items_status_idx ON task_items (kind, status);
