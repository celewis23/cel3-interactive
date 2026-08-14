-- Link task_items to a Project (Sanity pmProject._id) and an auto-synced Google Calendar event.
ALTER TABLE task_items
  ADD COLUMN IF NOT EXISTS project_id text,
  ADD COLUMN IF NOT EXISTS calendar_id text,
  ADD COLUMN IF NOT EXISTS calendar_event_id text,
  ADD COLUMN IF NOT EXISTS calendar_event_link text;

CREATE INDEX IF NOT EXISTS task_items_project_idx ON task_items (project_id);
