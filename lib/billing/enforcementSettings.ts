import { sql } from "@/lib/postgres";

export interface BillingEnforcementSettings {
  autoSuspendEnabled: boolean;
  daysLateThreshold: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

type Row = {
  auto_suspend_enabled: boolean;
  days_late_threshold: number;
  updated_at: string;
  updated_by: string | null;
};

const DEFAULTS: BillingEnforcementSettings = {
  autoSuspendEnabled: false,
  daysLateThreshold: 14,
  updatedAt: null,
  updatedBy: null,
};

export async function getEnforcementSettings(): Promise<BillingEnforcementSettings> {
  const rows = await sql.query<Row>(
    `SELECT auto_suspend_enabled, days_late_threshold, updated_at, updated_by
     FROM billing_enforcement_settings WHERE id = 'default' LIMIT 1`
  );
  if (!rows.length) return DEFAULTS;
  const row = rows[0];
  return {
    autoSuspendEnabled: Boolean(row.auto_suspend_enabled),
    daysLateThreshold: row.days_late_threshold,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export async function saveEnforcementSettings(input: {
  autoSuspendEnabled: boolean;
  daysLateThreshold: number;
  updatedBy: string | null;
}): Promise<BillingEnforcementSettings> {
  const rows = await sql.query<Row>(
    `INSERT INTO billing_enforcement_settings (id, auto_suspend_enabled, days_late_threshold, updated_at, updated_by)
     VALUES ('default', $1, $2, now(), $3)
     ON CONFLICT (id) DO UPDATE SET
       auto_suspend_enabled = EXCLUDED.auto_suspend_enabled,
       days_late_threshold = EXCLUDED.days_late_threshold,
       updated_at = now(),
       updated_by = EXCLUDED.updated_by
     RETURNING auto_suspend_enabled, days_late_threshold, updated_at, updated_by`,
    [input.autoSuspendEnabled, input.daysLateThreshold, input.updatedBy]
  );
  const row = rows[0];
  return {
    autoSuspendEnabled: Boolean(row.auto_suspend_enabled),
    daysLateThreshold: row.days_late_threshold,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}
