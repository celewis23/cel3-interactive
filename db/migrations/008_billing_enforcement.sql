-- Billing enforcement: global settings for automatically suspending a
-- client's website when their invoices go too many days past due.
-- Single-row config table, same pattern as meterwise_config.
CREATE TABLE IF NOT EXISTS billing_enforcement_settings (
  id                    text PRIMARY KEY DEFAULT 'default',
  auto_suspend_enabled  boolean NOT NULL DEFAULT false,
  days_late_threshold   integer NOT NULL DEFAULT 14,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            text
);
