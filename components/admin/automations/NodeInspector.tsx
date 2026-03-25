"use client";

import type {
  AutomationNode,
  AutomationTriggerType,
  ActionType,
  ConditionRule,
  ConditionOperator,
} from "@/lib/automations/types";
import { TRIGGER_LABELS, ACTION_LABELS, generateNodeId } from "@/lib/automations/types";

// ── Styles ────────────────────────────────────────────────────────────────────

const CLS_LABEL  = "text-[10px] font-semibold text-white/40 uppercase tracking-wider block mb-1";
const CLS_INPUT  = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-sky-500/40";
const CLS_SELECT = "w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500/40";
const CLS_SECTION = "px-4 py-3 border-b border-white/8 space-y-3";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  node: AutomationNode;
  allNodes: AutomationNode[];
  forms: Array<{ _id: string; name: string }>;
  staff: Array<{ _id: string; name: string; email: string }>;
  onChange: (config: AutomationNode["config"]) => void;
  suggestions?: unknown[];
}

// ── Condition fields ──────────────────────────────────────────────────────────

const CONDITION_FIELDS = [
  { value: "project.budget",           label: "Project budget" },
  { value: "project.status",           label: "Project status" },
  { value: "client.tag",               label: "Client tag" },
  { value: "client.status",            label: "Client status" },
  { value: "client.industry",          label: "Client industry" },
  { value: "invoice.amount",           label: "Invoice amount" },
  { value: "invoice.status",           label: "Invoice status" },
  { value: "lead.value",               label: "Lead value" },
  { value: "lead.source",              label: "Lead source" },
  { value: "lead.stage",               label: "Lead stage" },
  { value: "time_since_trigger_days",  label: "Days since trigger" },
];

const OPERATORS: Array<{ value: ConditionOperator; label: string }> = [
  { value: "equals",         label: "=" },
  { value: "not_equals",     label: "≠" },
  { value: "greater_than",   label: ">" },
  { value: "less_than",      label: "<" },
  { value: "contains",       label: "contains" },
  { value: "not_contains",   label: "doesn't contain" },
  { value: "is_empty",       label: "is empty" },
  { value: "is_not_empty",   label: "is not empty" },
];

// ── Trigger inspector ─────────────────────────────────────────────────────────

function TriggerInspector({ config, onChange }: {
  config: { trigger_type: AutomationTriggerType; [key: string]: unknown };
  onChange: (c: typeof config) => void;
}) {
  const groups: Record<string, AutomationTriggerType[]> = {};
  (Object.keys(TRIGGER_LABELS) as AutomationTriggerType[]).forEach((t) => {
    const cat = t.split("_")[0];
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(t);
  });

  return (
    <div className={CLS_SECTION}>
      <div>
        <label className={CLS_LABEL}>Trigger event</label>
        <select
          value={config.trigger_type}
          onChange={(e) => onChange({ ...config, trigger_type: e.target.value as AutomationTriggerType })}
          className={CLS_SELECT}
        >
          {(Object.keys(TRIGGER_LABELS) as AutomationTriggerType[]).map((t) => (
            <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Trigger-specific config */}
      {config.trigger_type === "appointment_before" && (
        <div>
          <label className={CLS_LABEL}>Days before</label>
          <input type="number" min={1} max={30} value={String(config.days_before ?? 1)}
            onChange={(e) => onChange({ ...config, days_before: parseInt(e.target.value) })}
            className={CLS_INPUT} />
        </div>
      )}
      {config.trigger_type === "form_completed" || config.trigger_type === "form_not_completed" ? (
        <div>
          <label className={CLS_LABEL}>Applies to all forms</label>
          <p className="text-[10px] text-white/30">Will fire for any form submission</p>
        </div>
      ) : null}
      {config.trigger_type === "lead_stage_changed" && (
        <div>
          <label className={CLS_LABEL}>From stage (optional)</label>
          <input type="text" placeholder="Any stage" value={String(config.from_stage ?? "")}
            onChange={(e) => onChange({ ...config, from_stage: e.target.value })}
            className={CLS_INPUT} />
          <label className={`${CLS_LABEL} mt-2`}>To stage (optional)</label>
          <input type="text" placeholder="Any stage" value={String(config.to_stage ?? "")}
            onChange={(e) => onChange({ ...config, to_stage: e.target.value })}
            className={CLS_INPUT} />
        </div>
      )}
    </div>
  );
}

// ── Delay inspector ───────────────────────────────────────────────────────────

function DelayInspector({ config, onChange }: {
  config: { amount: number; unit: string; mode: string; fixed_date?: string; condition?: string };
  onChange: (c: typeof config) => void;
}) {
  return (
    <div className={CLS_SECTION}>
      <div>
        <label className={CLS_LABEL}>Mode</label>
        <select value={config.mode} onChange={(e) => onChange({ ...config, mode: e.target.value })} className={CLS_SELECT}>
          <option value="relative">Relative (from previous step)</option>
          <option value="fixed">Fixed date</option>
        </select>
      </div>

      {config.mode === "relative" ? (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={CLS_LABEL}>Amount</label>
            <input type="number" min={0} value={config.amount}
              onChange={(e) => onChange({ ...config, amount: parseInt(e.target.value) || 0 })}
              className={CLS_INPUT} />
          </div>
          <div className="flex-1">
            <label className={CLS_LABEL}>Unit</label>
            <select value={config.unit} onChange={(e) => onChange({ ...config, unit: e.target.value })} className={CLS_SELECT}>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
            </select>
          </div>
        </div>
      ) : (
        <div>
          <label className={CLS_LABEL}>Fixed date & time</label>
          <input type="datetime-local" value={config.fixed_date ?? ""}
            onChange={(e) => onChange({ ...config, fixed_date: e.target.value })}
            className={CLS_INPUT} />
        </div>
      )}

      <div>
        <label className={CLS_LABEL}>Condition</label>
        <select value={config.condition ?? "immediately"} onChange={(e) => onChange({ ...config, condition: e.target.value })} className={CLS_SELECT}>
          <option value="immediately">Run immediately after delay</option>
          <option value="if_not_completed">Only if condition not yet met</option>
        </select>
      </div>
    </div>
  );
}

// ── Condition inspector ───────────────────────────────────────────────────────

function ConditionInspector({ config, onChange }: {
  config: { logic: string; conditions: ConditionRule[]; on_error: string };
  onChange: (c: typeof config) => void;
}) {
  const addRow = () => {
    onChange({
      ...config,
      conditions: [
        ...config.conditions,
        { field: "project.budget", operator: "greater_than", value: "" },
      ],
    });
  };

  const removeRow = (i: number) => {
    onChange({ ...config, conditions: config.conditions.filter((_, idx) => idx !== i) });
  };

  const updateRow = (i: number, row: ConditionRule) => {
    onChange({ ...config, conditions: config.conditions.map((c, idx) => idx === i ? row : c) });
  };

  return (
    <div className="space-y-0">
      <div className={CLS_SECTION}>
        <div>
          <label className={CLS_LABEL}>Logic</label>
          <select value={config.logic} onChange={(e) => onChange({ ...config, logic: e.target.value })} className={CLS_SELECT}>
            <option value="all">All conditions must match</option>
            <option value="any">Any condition matches</option>
          </select>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2 border-b border-white/8">
        <label className={CLS_LABEL}>Conditions (all must match)</label>
        {config.conditions.map((row, i) => (
          <div key={i} className="space-y-1.5 bg-white/3 rounded-lg p-2.5">
            <div className="flex gap-1.5">
              <select value={row.field} onChange={(e) => updateRow(i, { ...row, field: e.target.value as ConditionRule["field"] })}
                className={`${CLS_SELECT} flex-1`}>
                {CONDITION_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <button onClick={() => removeRow(i)} className="p-1.5 rounded text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex gap-1.5">
              <select value={row.operator} onChange={(e) => updateRow(i, { ...row, operator: e.target.value as ConditionOperator })}
                className={`${CLS_SELECT} w-28`}>
                {OPERATORS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {!["is_empty", "is_not_empty"].includes(row.operator) && (
                <input type="text" placeholder="Value" value={String(row.value)}
                  onChange={(e) => updateRow(i, { ...row, value: e.target.value })}
                  className={`${CLS_INPUT} flex-1`} />
              )}
            </div>
          </div>
        ))}
        <button onClick={addRow} className="w-full py-2 rounded-lg border border-dashed border-white/15 text-xs text-white/40 hover:text-white hover:border-white/30 transition-colors">
          + Add condition
        </button>
      </div>

      <div className={CLS_SECTION}>
        <div>
          <label className={CLS_LABEL}>On error</label>
          <select value={config.on_error} onChange={(e) => onChange({ ...config, on_error: e.target.value })} className={CLS_SELECT}>
            <option value="skip">Skip and continue</option>
            <option value="pause">Pause workflow</option>
            <option value="notify">Notify owner</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Action inspector ──────────────────────────────────────────────────────────

function ActionInspector({ config, forms, staff, onChange }: {
  config: { action_type: ActionType; action_config: Record<string, unknown>; require_approval: boolean; on_error: string };
  forms: Array<{ _id: string; name: string }>;
  staff: Array<{ _id: string; name: string; email: string }>;
  onChange: (c: typeof config) => void;
}) {
  const ac = config.action_config ?? {};
  const setAc = (updates: Record<string, unknown>) => onChange({ ...config, action_config: { ...ac, ...updates } });

  return (
    <div className="space-y-0">
      <div className={CLS_SECTION}>
        <div>
          <label className={CLS_LABEL}>Action type</label>
          <select value={config.action_type}
            onChange={(e) => onChange({ ...config, action_type: e.target.value as ActionType, action_config: {} })}
            className={CLS_SELECT}>
            {(Object.keys(ACTION_LABELS) as ActionType[]).map((t) => (
              <option key={t} value={t}>{ACTION_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dynamic fields */}
      <div className={CLS_SECTION}>
        {config.action_type === "send_email" && (
          <>
            <div>
              <label className={CLS_LABEL}>Send to</label>
              <select value={String(ac.to ?? "client")} onChange={(e) => setAc({ to: e.target.value })} className={CLS_SELECT}>
                <option value="client">Client</option>
                <option value="team_member">Team member</option>
                <option value="custom">Custom email</option>
              </select>
            </div>
            {ac.to === "custom" && (
              <div>
                <label className={CLS_LABEL}>Email address</label>
                <input type="email" value={String(ac.recipient_email ?? "")} onChange={(e) => setAc({ recipient_email: e.target.value })}
                  placeholder="email@example.com" className={CLS_INPUT} />
              </div>
            )}
            {ac.to === "team_member" && (
              <div>
                <label className={CLS_LABEL}>Team member</label>
                <select value={String(ac.recipient_user_id ?? "")} onChange={(e) => setAc({ recipient_user_id: e.target.value })} className={CLS_SELECT}>
                  <option value="">Select staff member</option>
                  {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={CLS_LABEL}>Subject</label>
              <input type="text" value={String(ac.subject ?? "")} onChange={(e) => setAc({ subject: e.target.value })}
                placeholder="e.g. Welcome {{client.name}}!" className={CLS_INPUT} />
            </div>
            <div>
              <label className={CLS_LABEL}>Body</label>
              <textarea rows={6} value={String(ac.body_html ?? "")} onChange={(e) => setAc({ body_html: e.target.value })}
                placeholder="Email body (HTML supported). Use {{client.name}}, {{project.name}}, etc."
                className={`${CLS_INPUT} resize-none`} />
              <p className="text-[10px] text-white/25 mt-1">
                Variables: {"{{client.name}}, {{client.email}}, {{project.name}}, {{invoice.number}}"}
              </p>
            </div>
          </>
        )}

        {config.action_type === "send_sms" && (
          <>
            <div>
              <label className={CLS_LABEL}>Send to</label>
              <select value={String(ac.to ?? "client")} onChange={(e) => setAc({ to: e.target.value })} className={CLS_SELECT}>
                <option value="client">Client</option>
                <option value="team_member">Team member</option>
              </select>
            </div>
            <div>
              <label className={CLS_LABEL}>Message</label>
              <textarea rows={3} value={String(ac.message ?? "")} onChange={(e) => setAc({ message: e.target.value })}
                placeholder="Hi {{client.name}}, …" className={`${CLS_INPUT} resize-none`} />
            </div>
            <p className="text-[10px] text-amber-400/60 bg-amber-500/8 rounded px-2 py-1.5">
              Requires Twilio integration
            </p>
          </>
        )}

        {config.action_type === "send_form" && (
          <>
            <div>
              <label className={CLS_LABEL}>Form</label>
              <select value={String(ac.form_id ?? "")} onChange={(e) => setAc({ form_id: e.target.value })} className={CLS_SELECT}>
                <option value="">Select form</option>
                {forms.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className={CLS_LABEL}>Send method</label>
              <select value={String(ac.send_method ?? "email")} onChange={(e) => setAc({ send_method: e.target.value })} className={CLS_SELECT}>
                <option value="email">Send via email</option>
                <option value="portal">Send via client portal</option>
              </select>
            </div>
          </>
        )}

        {config.action_type === "create_task" && (
          <>
            <div>
              <label className={CLS_LABEL}>Task title</label>
              <input type="text" value={String(ac.title ?? "")} onChange={(e) => setAc({ title: e.target.value })}
                placeholder="e.g. Follow up with {{client.name}}" className={CLS_INPUT} />
            </div>
            <div>
              <label className={CLS_LABEL}>Description (optional)</label>
              <textarea rows={2} value={String(ac.description ?? "")} onChange={(e) => setAc({ description: e.target.value })}
                className={`${CLS_INPUT} resize-none`} />
            </div>
            <div>
              <label className={CLS_LABEL}>Priority</label>
              <select value={String(ac.priority ?? "medium")} onChange={(e) => setAc({ priority: e.target.value })} className={CLS_SELECT}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className={CLS_LABEL}>Assign to</label>
              <select value={String(ac.assigned_to_user_id ?? "")} onChange={(e) => setAc({ assigned_to_user_id: e.target.value })} className={CLS_SELECT}>
                <option value="">Unassigned</option>
                {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={CLS_LABEL}>Due (days from now)</label>
              <input type="number" min={0} value={String(ac.due_days_from_now ?? "")}
                onChange={(e) => setAc({ due_days_from_now: parseInt(e.target.value) || undefined })}
                placeholder="e.g. 3" className={CLS_INPUT} />
            </div>
          </>
        )}

        {config.action_type === "add_client_tag" && (
          <div>
            <label className={CLS_LABEL}>Tag to add</label>
            <input type="text" value={String(ac.tag ?? "")} onChange={(e) => setAc({ tag: e.target.value })}
              placeholder='e.g. "VIP"' className={CLS_INPUT} />
          </div>
        )}

        {config.action_type === "remove_client_tag" && (
          <div>
            <label className={CLS_LABEL}>Tag to remove</label>
            <input type="text" value={String(ac.tag ?? "")} onChange={(e) => setAc({ tag: e.target.value })}
              placeholder='e.g. "Lead"' className={CLS_INPUT} />
          </div>
        )}

        {config.action_type === "move_lead_stage" && (
          <div>
            <label className={CLS_LABEL}>Move to stage</label>
            <input type="text" value={String(ac.stage ?? "")} onChange={(e) => setAc({ stage: e.target.value })}
              placeholder="e.g. Qualified" className={CLS_INPUT} />
          </div>
        )}

        {config.action_type === "change_project_status" && (
          <div>
            <label className={CLS_LABEL}>New status</label>
            <select value={String(ac.status ?? "active")} onChange={(e) => setAc({ status: e.target.value })} className={CLS_SELECT}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
              <option value="on_hold">On hold</option>
            </select>
          </div>
        )}

        {config.action_type === "send_internal_notification" && (
          <>
            <div>
              <label className={CLS_LABEL}>Notify</label>
              <select value={Array.isArray(ac.user_ids) ? "specific" : String(ac.user_ids ?? "all_admins")}
                onChange={(e) => setAc({ user_ids: e.target.value === "all_admins" ? "all_admins" : [] })} className={CLS_SELECT}>
                <option value="all_admins">All admins</option>
                <option value="specific">Specific staff members</option>
              </select>
            </div>
            <div>
              <label className={CLS_LABEL}>Message</label>
              <textarea rows={3} value={String(ac.message ?? "")} onChange={(e) => setAc({ message: e.target.value })}
                placeholder="e.g. {{client.name}} just signed their contract." className={`${CLS_INPUT} resize-none`} />
            </div>
          </>
        )}

        {config.action_type === "webhook_post" && (
          <>
            <div>
              <label className={CLS_LABEL}>URL</label>
              <input type="url" value={String(ac.url ?? "")} onChange={(e) => setAc({ url: e.target.value })}
                placeholder="https://hooks.example.com/..." className={CLS_INPUT} />
            </div>
            <div>
              <label className={CLS_LABEL}>Method</label>
              <select value={String(ac.method ?? "POST")} onChange={(e) => setAc({ method: e.target.value })} className={CLS_SELECT}>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
            <div>
              <label className={CLS_LABEL}>Body template (JSON)</label>
              <textarea rows={4} value={String(ac.body_template ?? "")} onChange={(e) => setAc({ body_template: e.target.value })}
                placeholder={'{"client": "{{client.name}}", "event": "{{trigger_type}}"}'} className={`${CLS_INPUT} font-mono resize-none text-[11px]`} />
            </div>
          </>
        )}

        {config.action_type === "activate_portal" && (
          <div>
            <label className={CLS_LABEL}>Action</label>
            <select value={ac.activate === false ? "deactivate" : "activate"} onChange={(e) => setAc({ activate: e.target.value === "activate" })} className={CLS_SELECT}>
              <option value="activate">Activate portal</option>
              <option value="deactivate">Deactivate portal</option>
            </select>
          </div>
        )}

        {["archive_project", "pause_workflow"].includes(config.action_type) && (
          <p className="text-xs text-white/40">No configuration needed for this action.</p>
        )}
      </div>

      {/* Error handling + approval */}
      <div className={CLS_SECTION}>
        <div>
          <label className={CLS_LABEL}>On error</label>
          <select value={config.on_error} onChange={(e) => onChange({ ...config, on_error: e.target.value })} className={CLS_SELECT}>
            <option value="skip">Skip and continue</option>
            <option value="pause">Pause workflow</option>
            <option value="notify">Notify owner</option>
          </select>
        </div>

        <div>
          <label className={CLS_LABEL}>Require approval</label>
          <select value={config.require_approval ? "yes" : "no"}
            onChange={(e) => onChange({ ...config, require_approval: e.target.value === "yes" })} className={CLS_SELECT}>
            <option value="no">No (auto-run)</option>
            <option value="yes">Yes — notify me before this fires</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Main inspector ────────────────────────────────────────────────────────────

export default function NodeInspector({ node, allNodes, forms, staff, onChange }: Props) {
  return (
    <div>
      {/* Node type header */}
      <div className="px-4 py-3 border-b border-white/8">
        <div className="text-xs font-semibold text-white capitalize">
          {node.type} node
        </div>
        <div className="text-[10px] text-white/40 mt-0.5 font-mono">{node.id}</div>
      </div>

      {node.type === "trigger" && (
        <TriggerInspector
          config={node.config as { trigger_type: AutomationTriggerType; [key: string]: unknown }}
          onChange={onChange as (c: unknown) => void}
        />
      )}
      {node.type === "delay" && (
        <DelayInspector
          config={node.config as { amount: number; unit: string; mode: string; fixed_date?: string; condition?: string }}
          onChange={onChange as (c: unknown) => void}
        />
      )}
      {node.type === "condition" && (
        <ConditionInspector
          config={node.config as { logic: string; conditions: ConditionRule[]; on_error: string }}
          onChange={onChange as (c: unknown) => void}
        />
      )}
      {node.type === "action" && (
        <ActionInspector
          config={node.config as { action_type: ActionType; action_config: Record<string, unknown>; require_approval: boolean; on_error: string }}
          forms={forms}
          staff={staff}
          onChange={onChange as (c: unknown) => void}
        />
      )}
    </div>
  );
}
