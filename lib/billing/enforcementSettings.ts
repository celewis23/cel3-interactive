import { sql } from "@/lib/postgres";

export interface BillingEnforcementSettings {
  autoSuspendEnabled: boolean;
  daysLateThreshold: number;
  firstNoticeDays: number;
  secondNoticeDays: number;
  finalNoticeDays: number;
  suspendDays: number;
  lateFeeCents: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

type Row = {
  auto_suspend_enabled: boolean;
  days_late_threshold: number;
  first_notice_days: number;
  second_notice_days: number;
  final_notice_days: number;
  suspend_days: number;
  late_fee_cents: number;
  updated_at: string;
  updated_by: string | null;
};

const COLUMNS = `auto_suspend_enabled, days_late_threshold, first_notice_days, second_notice_days,
  final_notice_days, suspend_days, late_fee_cents, updated_at, updated_by`;

const DEFAULTS: BillingEnforcementSettings = {
  autoSuspendEnabled: false,
  daysLateThreshold: 14,
  firstNoticeDays: 1,
  secondNoticeDays: 5,
  finalNoticeDays: 10,
  suspendDays: 11,
  lateFeeCents: 2500,
  updatedAt: null,
  updatedBy: null,
};

function mapRow(row: Row): BillingEnforcementSettings {
  return {
    autoSuspendEnabled: Boolean(row.auto_suspend_enabled),
    daysLateThreshold: row.days_late_threshold,
    firstNoticeDays: row.first_notice_days,
    secondNoticeDays: row.second_notice_days,
    finalNoticeDays: row.final_notice_days,
    suspendDays: row.suspend_days,
    lateFeeCents: row.late_fee_cents,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export async function getEnforcementSettings(): Promise<BillingEnforcementSettings> {
  const rows = await sql.query<Row>(
    `SELECT ${COLUMNS} FROM billing_enforcement_settings WHERE id = 'default' LIMIT 1`
  );
  if (!rows.length) return DEFAULTS;
  return mapRow(rows[0]);
}

export async function saveEnforcementSettings(input: {
  autoSuspendEnabled: boolean;
  firstNoticeDays: number;
  secondNoticeDays: number;
  finalNoticeDays: number;
  suspendDays: number;
  lateFeeCents: number;
  updatedBy: string | null;
}): Promise<BillingEnforcementSettings> {
  const rows = await sql.query<Row>(
    `INSERT INTO billing_enforcement_settings
       (id, auto_suspend_enabled, first_notice_days, second_notice_days, final_notice_days, suspend_days, late_fee_cents, updated_at, updated_by)
     VALUES ('default', $1, $2, $3, $4, $5, $6, now(), $7)
     ON CONFLICT (id) DO UPDATE SET
       auto_suspend_enabled = EXCLUDED.auto_suspend_enabled,
       first_notice_days = EXCLUDED.first_notice_days,
       second_notice_days = EXCLUDED.second_notice_days,
       final_notice_days = EXCLUDED.final_notice_days,
       suspend_days = EXCLUDED.suspend_days,
       late_fee_cents = EXCLUDED.late_fee_cents,
       updated_at = now(),
       updated_by = EXCLUDED.updated_by
     RETURNING ${COLUMNS}`,
    [
      input.autoSuspendEnabled,
      input.firstNoticeDays,
      input.secondNoticeDays,
      input.finalNoticeDays,
      input.suspendDays,
      input.lateFeeCents,
      input.updatedBy,
    ]
  );
  return mapRow(rows[0]);
}
