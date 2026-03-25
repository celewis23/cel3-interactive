// ─────────────────────────────────────────────────────────────────────────────
// Automation System — Shared TypeScript Types
// All node shapes, config shapes, run records, and Sanity document types
// ─────────────────────────────────────────────────────────────────────────────

// ── Trigger Types ─────────────────────────────────────────────────────────────

export type AutomationTriggerType =
  | "contract_signed"
  | "contract_declined"
  | "contract_expired"
  | "invoice_paid_full"
  | "invoice_installment_paid"
  | "invoice_overdue"
  | "invoice_sent"
  | "invoice_viewed"
  | "form_completed"
  | "form_not_completed"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_no_show"
  | "appointment_before"
  | "appointment_after"
  | "lead_stage_changed"
  | "lead_created"
  | "lead_won"
  | "lead_lost"
  | "client_created"
  | "client_status_changed"
  | "task_assigned"
  | "task_due_soon"
  | "task_completed"
  | "project_status_changed"
  | "project_start_date"
  | "project_end_date"
  | "time_entry_submitted"
  | "manual";

export const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  contract_signed:           "Contract signed by client",
  contract_declined:         "Contract declined",
  contract_expired:          "Contract expired",
  invoice_paid_full:         "Invoice paid in full",
  invoice_installment_paid:  "Invoice installment paid",
  invoice_overdue:           "Invoice overdue",
  invoice_sent:              "Invoice sent",
  invoice_viewed:            "Invoice viewed",
  form_completed:            "Form completed",
  form_not_completed:        "Form not completed (deadline passed)",
  booking_confirmed:         "Booking confirmed",
  booking_cancelled:         "Booking cancelled",
  booking_no_show:           "Booking — no show",
  appointment_before:        "Before appointment",
  appointment_after:         "After appointment",
  lead_stage_changed:        "Lead stage changed",
  lead_created:              "Lead created",
  lead_won:                  "Lead won",
  lead_lost:                 "Lead lost",
  client_created:            "Client created",
  client_status_changed:     "Client status changed",
  task_assigned:             "Task assigned",
  task_due_soon:             "Task due soon",
  task_completed:            "Task completed",
  project_status_changed:    "Project status changed",
  project_start_date:        "Project start date reached",
  project_end_date:          "Project end date reached",
  time_entry_submitted:      "Time entry submitted",
  manual:                    "Manual trigger",
};

export const TRIGGER_CATEGORY: Record<AutomationTriggerType, string> = {
  contract_signed:           "Contracts",
  contract_declined:         "Contracts",
  contract_expired:          "Contracts",
  invoice_paid_full:         "Invoices",
  invoice_installment_paid:  "Invoices",
  invoice_overdue:           "Invoices",
  invoice_sent:              "Invoices",
  invoice_viewed:            "Invoices",
  form_completed:            "Forms",
  form_not_completed:        "Forms",
  booking_confirmed:         "Bookings",
  booking_cancelled:         "Bookings",
  booking_no_show:           "Bookings",
  appointment_before:        "Bookings",
  appointment_after:         "Bookings",
  lead_stage_changed:        "Pipeline",
  lead_created:              "Pipeline",
  lead_won:                  "Pipeline",
  lead_lost:                 "Pipeline",
  client_created:            "Clients",
  client_status_changed:     "Clients",
  task_assigned:             "Tasks",
  task_due_soon:             "Tasks",
  task_completed:            "Tasks",
  project_status_changed:    "Projects",
  project_start_date:        "Projects",
  project_end_date:          "Projects",
  time_entry_submitted:      "Time",
  manual:                    "Manual",
};

// ── Node Types ────────────────────────────────────────────────────────────────

export type AutomationNodeType = "trigger" | "delay" | "condition" | "action";

// ── Trigger Node ──────────────────────────────────────────────────────────────

export interface TriggerConfig {
  trigger_type: AutomationTriggerType;
  /** Extra config e.g. days_before, form_id, stage filter */
  [key: string]: unknown;
}

export interface TriggerNode {
  id: string;
  type: "trigger";
  position: { x: number; y: number };
  config: TriggerConfig;
  next: string | null;
  branches?: never;
}

// ── Delay Node ────────────────────────────────────────────────────────────────

export interface DelayConfig {
  amount: number;
  unit: "minutes" | "hours" | "days" | "weeks";
  mode: "relative" | "fixed";
  fixed_date?: string;                 // ISO string, used when mode === "fixed"
  condition?: "immediately" | "if_not_completed";
  condition_check?: string;            // e.g. form_id to check completion
}

export interface DelayNode {
  id: string;
  type: "delay";
  position: { x: number; y: number };
  config: DelayConfig;
  next: string | null;
  branches?: never;
}

// ── Condition Node ────────────────────────────────────────────────────────────

export type ConditionField =
  | "project.budget"
  | "project.status"
  | "client.tag"
  | "client.status"
  | "client.industry"
  | "invoice.amount"
  | "invoice.status"
  | "lead.value"
  | "lead.source"
  | "lead.stage"
  | "time_since_trigger_days"
  | `custom_field.${string}`;

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_not_empty";

export interface ConditionRule {
  field: ConditionField | string;
  operator: ConditionOperator;
  value: string | number | boolean;
}

export interface ConditionConfig {
  logic: "all" | "any";
  conditions: ConditionRule[];
  on_error: "skip" | "pause" | "notify";
}

export interface ConditionNode {
  id: string;
  type: "condition";
  position: { x: number; y: number };
  config: ConditionConfig;
  next?: string | null;
  branches: {
    yes: string | null;
    no: string | null;
  };
}

// ── Action Types ──────────────────────────────────────────────────────────────

export type ActionType =
  | "send_email"
  | "send_sms"
  | "send_form"
  | "send_contract"
  | "send_invoice"
  | "send_scheduler"
  | "create_task"
  | "change_project_status"
  | "move_lead_stage"
  | "add_client_tag"
  | "remove_client_tag"
  | "activate_portal"
  | "archive_project"
  | "apply_workflow"
  | "pause_workflow"
  | "send_internal_notification"
  | "post_slack"
  | "webhook_post";

export const ACTION_LABELS: Record<ActionType, string> = {
  send_email:                  "Send email",
  send_sms:                    "Send SMS",
  send_form:                   "Send form",
  send_contract:               "Send contract",
  send_invoice:                "Send invoice",
  send_scheduler:              "Send scheduling link",
  create_task:                 "Create task",
  change_project_status:       "Change project status",
  move_lead_stage:             "Move lead stage",
  add_client_tag:              "Add client tag",
  remove_client_tag:           "Remove client tag",
  activate_portal:             "Activate/deactivate portal",
  archive_project:             "Archive project",
  apply_workflow:              "Apply child workflow",
  pause_workflow:              "Pause workflow",
  send_internal_notification:  "Send internal notification",
  post_slack:                  "Post to Slack",
  webhook_post:                "Webhook POST",
};

// Action config shapes
export interface SendEmailConfig {
  to: "client" | "team_member" | "custom";
  recipient_user_id?: string;
  recipient_email?: string;
  template_id?: string;
  subject: string;
  body_html: string;
}

export interface SendSmsConfig {
  to: "client" | "team_member";
  phone_field: "primary" | "mobile";
  message: string;
}

export interface SendFormConfig {
  form_id: string;
  send_method: "email" | "portal";
}

export interface SendContractConfig {
  contract_template_id: string;
  apply_only: boolean;
}

export interface SendInvoiceConfig {
  invoice_template_id: string;
}

export interface SendSchedulerConfig {
  scheduler_id: string;
}

export interface CreateTaskConfig {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  assigned_to_user_id?: string;
  due_days_from_now?: number;
  project_id_source: "trigger" | "fixed";
  project_id?: string;
}

export interface ChangeProjectStatusConfig {
  status: string;
}

export interface MoveLeadStageConfig {
  stage: string;
}

export interface AddClientTagConfig {
  tag: string;
}

export interface RemoveClientTagConfig {
  tag: string;
}

export interface ActivatePortalConfig {
  activate: boolean;
}

export interface ApplyWorkflowConfig {
  automation_id: string;
}

export interface SendInternalNotificationConfig {
  user_ids: string[] | "all_admins";
  message: string;
}

export interface PostSlackConfig {
  channel_id: string;
  message: string;
}

export interface WebhookPostConfig {
  url: string;
  method: "POST" | "PUT";
  headers_json?: string;
  body_template: string;
}

export type ActionConfig =
  | SendEmailConfig
  | SendSmsConfig
  | SendFormConfig
  | SendContractConfig
  | SendInvoiceConfig
  | SendSchedulerConfig
  | CreateTaskConfig
  | ChangeProjectStatusConfig
  | MoveLeadStageConfig
  | AddClientTagConfig
  | RemoveClientTagConfig
  | ActivatePortalConfig
  | Record<string, never>   // archive_project, pause_workflow
  | ApplyWorkflowConfig
  | SendInternalNotificationConfig
  | PostSlackConfig
  | WebhookPostConfig;

export interface ActionNodeConfig {
  action_type: ActionType;
  action_config: ActionConfig;
  require_approval: boolean;
  on_error: "skip" | "pause" | "notify";
}

export interface ActionNode {
  id: string;
  type: "action";
  position: { x: number; y: number };
  config: ActionNodeConfig;
  next: string | null;
  branches?: never;
}

// ── Union node type ───────────────────────────────────────────────────────────

export type AutomationNode = TriggerNode | DelayNode | ConditionNode | ActionNode;

// ── Node graph (stored as automations.nodes JSON) ─────────────────────────────

export interface AutomationNodeGraph {
  nodes: AutomationNode[];
}

// ── Automation document (Sanity _type: "automation") ─────────────────────────

export interface Automation {
  _id: string;
  _type: "automation";
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  triggerConfig?: Record<string, unknown>;
  nodes: AutomationNodeGraph;
  enabled: boolean;
  runCount: number;
  lastRunAt?: string;
  createdBy?: string;
  _createdAt: string;
  _updatedAt: string;
}

// ── Automation run (Sanity _type: "automationRun") ────────────────────────────

export type AutomationRunStatus = "running" | "completed" | "failed" | "skipped" | "dry_run";

export interface AutomationRun {
  _id: string;
  _type: "automationRun";
  automationId: string;
  automationName?: string;
  triggeredByEntityType?: string;
  triggeredByEntityId?: string;
  triggeredByClientId?: string;
  status: AutomationRunStatus;
  branchPath?: Record<string, "yes" | "no">;   // nodeId → branch taken
  error?: string;
  isDryRun?: boolean;
  startedAt: string;
  completedAt?: string;
  _createdAt: string;
}

// ── Automation run step (Sanity _type: "automationRunStep") ──────────────────

export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "awaiting_approval";

export interface AutomationRunStep {
  _id: string;
  _type: "automationRunStep";
  runId: string;
  nodeId: string;
  nodeType: AutomationNodeType;
  nodeLabel?: string;
  status: StepStatus;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  error?: string;
  executeAt?: string;       // For pending delay steps
  executedAt?: string;
  _createdAt: string;
}

// ── Automation approval (Sanity _type: "automationApproval") ─────────────────

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface AutomationApproval {
  _id: string;
  _type: "automationApproval";
  runId: string;
  nodeId: string;
  automationId: string;
  automationName?: string;
  actionDescription?: string;
  clientName?: string;
  entityType?: string;
  entityId?: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  status: ApprovalStatus;
  _createdAt: string;
}

// ── Automation template (Sanity _type: "automationTemplate") ─────────────────

export interface AutomationTemplate {
  _id: string;
  _type: "automationTemplate";
  name: string;
  description: string;
  triggerType: AutomationTriggerType;
  nodes: AutomationNodeGraph;
  category?: string;
  isBuiltIn: boolean;
  _createdAt: string;
}

// ── Execution context (used internally by the engine) ────────────────────────

export interface TriggerContext {
  orgId: string;
  triggerType: AutomationTriggerType;
  triggerConfig?: Record<string, unknown>;
  entityType: string;
  entityId: string;
  clientId?: string;
}

export interface ExecutionContext extends TriggerContext {
  runId: string;
  isDryRun: boolean;
  /** Resolved data fetched from Sanity — populated lazily */
  data: {
    client?: Record<string, unknown>;
    project?: Record<string, unknown>;
    invoice?: Record<string, unknown>;
    contract?: Record<string, unknown>;
    lead?: Record<string, unknown>;
    booking?: Record<string, unknown>;
    task?: Record<string, unknown>;
    org?: Record<string, unknown>;
  };
}

// ── Palette item (for the builder UI drag palette) ────────────────────────────

export interface PaletteItem {
  type: AutomationNodeType;
  subtype?: ActionType | AutomationTriggerType;
  label: string;
  icon: string;           // SVG path data
  category?: string;
  color: "amber" | "green" | "gray" | "blue";
  defaultConfig: Partial<AutomationNode["config"]>;
}

// ── AI suggestion ─────────────────────────────────────────────────────────────

export interface AutomationSuggestion {
  label: string;
  description: string;
  node: Omit<AutomationNode, "id" | "position">;
}

// ── Nanoid-compatible short ID generator ─────────────────────────────────────

export function generateNodeId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "node_";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ── Helper: get human-readable node summary ──────────────────────────────────

export function summariseNode(node: AutomationNode): string {
  switch (node.type) {
    case "trigger": {
      const cfg = node.config as TriggerConfig;
      return TRIGGER_LABELS[cfg.trigger_type] ?? cfg.trigger_type;
    }
    case "delay": {
      const cfg = node.config as DelayConfig;
      return `Wait ${cfg.amount} ${cfg.unit}`;
    }
    case "condition": {
      const cfg = node.config as ConditionConfig;
      return `Check: ${cfg.conditions.length} condition${cfg.conditions.length !== 1 ? "s" : ""}`;
    }
    case "action": {
      const cfg = node.config as ActionNodeConfig;
      return ACTION_LABELS[cfg.action_type] ?? cfg.action_type;
    }
  }
}
