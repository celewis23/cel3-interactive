-- Dunning ladder configuration: how many days past an invoice's due date
-- each escalation stage fires, and the flat late fee amount. Extends the
-- existing billing_enforcement_settings single-row table.
ALTER TABLE billing_enforcement_settings
  ADD COLUMN IF NOT EXISTS first_notice_days  integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS second_notice_days integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS final_notice_days  integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS suspend_days        integer NOT NULL DEFAULT 11,
  ADD COLUMN IF NOT EXISTS late_fee_cents      integer NOT NULL DEFAULT 2500;
