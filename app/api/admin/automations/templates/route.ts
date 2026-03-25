export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { generateNodeId } from "@/lib/automations/types";

// ── Built-in templates ────────────────────────────────────────────────────────

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodes: any[];
  tags: string[];
}

const TEMPLATES: AutomationTemplate[] = [
  // 1. Client onboarding
  {
    id: "tpl_client_onboarding",
    name: "Client Onboarding Welcome",
    description: "Send a welcome email and create an onboarding task when a new client is added.",
    category: "Clients",
    triggerType: "client_created",
    tags: ["onboarding", "email", "tasks"],
    nodes: [
      {
        id: generateNodeId(),
        type: "trigger",
        config: { trigger_type: "client_created", trigger_config: {} },
        next: null,
        branches: undefined,
        position: { x: 0, y: 0 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Send welcome email",
          action_type: "send_email",
          action_config: {
            to: "{{client.email}}",
            subject: "Welcome to {{org.name}}!",
            body_html: "<p>Hi {{client.name}},</p><p>We're thrilled to have you on board. Your dedicated project manager will reach out within 24 hours.</p>",
          },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 120 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Create onboarding task",
          action_type: "create_task",
          action_config: {
            title: "Onboard {{client.name}}",
            priority: "high",
            due_days_from_now: 2,
          },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 240 },
      },
    ],
  },

  // 2. Invoice follow-up
  {
    id: "tpl_invoice_followup",
    name: "Invoice Follow-up Sequence",
    description: "Wait 3 days after an invoice is sent, then send a polite follow-up email if not paid.",
    category: "Billing",
    triggerType: "invoice_sent",
    tags: ["billing", "email", "follow-up"],
    nodes: [
      {
        id: generateNodeId(),
        type: "trigger",
        config: { trigger_type: "invoice_sent", trigger_config: {} },
        next: null,
        branches: undefined,
        position: { x: 0, y: 0 },
      },
      {
        id: generateNodeId(),
        type: "delay",
        config: { label: "Wait 3 days", delay_unit: "days", delay_value: 3 },
        next: null,
        branches: undefined,
        position: { x: 0, y: 120 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Send follow-up email",
          action_type: "send_email",
          action_config: {
            to: "{{client.email}}",
            subject: "Friendly reminder — Invoice {{invoice.number}}",
            body_html: "<p>Hi {{client.name}},</p><p>Just a friendly reminder that invoice {{invoice.number}} for {{invoice.amount}} is outstanding. Please let us know if you have any questions!</p>",
          },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 240 },
      },
    ],
  },

  // 3. Lead nurture
  {
    id: "tpl_lead_nurture",
    name: "New Lead Nurture",
    description: "Tag the lead, notify the team, and schedule a follow-up task when a new lead is created.",
    category: "Pipeline",
    triggerType: "lead_created",
    tags: ["pipeline", "leads", "nurture"],
    nodes: [
      {
        id: generateNodeId(),
        type: "trigger",
        config: { trigger_type: "lead_created", trigger_config: {} },
        next: null,
        branches: undefined,
        position: { x: 0, y: 0 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Tag as new lead",
          action_type: "add_client_tag",
          action_config: { tag: "new-lead" },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 120 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Notify sales team",
          action_type: "send_internal_notification",
          action_config: { user_ids: "all_admins", message: "New lead: {{contact.name}} from {{contact.company}}" },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 240 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Create follow-up task",
          action_type: "create_task",
          action_config: { title: "Follow up with {{contact.name}}", priority: "high", due_days_from_now: 1 },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 360 },
      },
    ],
  },

  // 4. Project completion
  {
    id: "tpl_project_completion",
    name: "Project Completion Wrap-up",
    description: "Notify the client and team when a project status changes to completed.",
    category: "Projects",
    triggerType: "project_status_changed",
    tags: ["projects", "completion", "email"],
    nodes: [
      {
        id: generateNodeId(),
        type: "trigger",
        config: { trigger_type: "project_status_changed", trigger_config: { status: "completed" } },
        next: null,
        branches: undefined,
        position: { x: 0, y: 0 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Email client — project complete",
          action_type: "send_email",
          action_config: {
            to: "{{client.email}}",
            subject: "Your project is complete! 🎉",
            body_html: "<p>Hi {{client.name}},</p><p>Great news — {{project.name}} has been marked complete. We hope you're thrilled with the results!</p>",
          },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 120 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Notify team",
          action_type: "send_internal_notification",
          action_config: { user_ids: "all_admins", message: "Project {{project.name}} marked complete." },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 240 },
      },
    ],
  },

  // 5. Contract signed onboarding
  {
    id: "tpl_contract_signed",
    name: "Contract Signed — Kick Off",
    description: "Move the lead to 'won', send a confirmation email, and create a project kickoff task when a contract is signed.",
    category: "Contracts",
    triggerType: "contract_signed",
    tags: ["contracts", "onboarding", "pipeline"],
    nodes: [
      {
        id: generateNodeId(),
        type: "trigger",
        config: { trigger_type: "contract_signed", trigger_config: {} },
        next: null,
        branches: undefined,
        position: { x: 0, y: 0 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Move lead to Won",
          action_type: "move_lead_stage",
          action_config: { stage: "won" },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 120 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Send confirmation email",
          action_type: "send_email",
          action_config: {
            to: "{{client.email}}",
            subject: "Contract signed — let's get started!",
            body_html: "<p>Hi {{client.name}},</p><p>Thanks for signing! We're excited to get started on your project. You'll hear from us shortly with next steps.</p>",
          },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 240 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Create kickoff task",
          action_type: "create_task",
          action_config: { title: "Kickoff call with {{client.name}}", priority: "high", due_days_from_now: 3 },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 360 },
      },
    ],
  },

  // 6. Contract expiry warning
  {
    id: "tpl_contract_expiry",
    name: "Contract Expiry Warning",
    description: "Send an internal alert when a contract expires without being signed.",
    category: "Contracts",
    triggerType: "contract_expired",
    tags: ["contracts", "expiry", "alert"],
    nodes: [
      {
        id: generateNodeId(),
        type: "trigger",
        config: { trigger_type: "contract_expired", trigger_config: {} },
        next: null,
        branches: undefined,
        position: { x: 0, y: 0 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Alert team of expired contract",
          action_type: "send_internal_notification",
          action_config: { user_ids: "all_admins", message: "Contract for {{client.name}} has expired unsigned." },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 120 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Create follow-up task",
          action_type: "create_task",
          action_config: { title: "Re-engage {{client.name}} — contract expired", priority: "medium", due_days_from_now: 1 },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 240 },
      },
    ],
  },

  // 7. Booking confirmation
  {
    id: "tpl_booking_confirmed",
    name: "Booking Confirmation",
    description: "Send a confirmation email and internal notification when a booking is confirmed.",
    category: "Bookings",
    triggerType: "booking_confirmed",
    tags: ["bookings", "confirmation", "email"],
    nodes: [
      {
        id: generateNodeId(),
        type: "trigger",
        config: { trigger_type: "booking_confirmed", trigger_config: {} },
        next: null,
        branches: undefined,
        position: { x: 0, y: 0 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Send booking confirmation",
          action_type: "send_email",
          action_config: {
            to: "{{client.email}}",
            subject: "Your booking is confirmed!",
            body_html: "<p>Hi {{client.name}},</p><p>Your booking has been confirmed. We look forward to seeing you!</p>",
          },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 120 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Notify team of booking",
          action_type: "send_internal_notification",
          action_config: { user_ids: "all_admins", message: "New booking confirmed for {{client.name}}." },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 240 },
      },
    ],
  },

  // 8. VIP client routing
  {
    id: "tpl_vip_routing",
    name: "VIP Client Routing",
    description: "Notify senior staff and tag the contact when a lead is marked as Won with high value.",
    category: "Pipeline",
    triggerType: "lead_won",
    tags: ["pipeline", "vip", "routing"],
    nodes: [
      {
        id: generateNodeId(),
        type: "trigger",
        config: { trigger_type: "lead_won", trigger_config: {} },
        next: null,
        branches: undefined,
        position: { x: 0, y: 0 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Tag as VIP",
          action_type: "add_client_tag",
          action_config: { tag: "vip" },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 120 },
      },
      {
        id: generateNodeId(),
        type: "action",
        config: {
          label: "Alert team — new client won",
          action_type: "send_internal_notification",
          action_config: { user_ids: "all_admins", message: "🎉 New client won: {{contact.name}} from {{contact.company}}" },
          require_approval: false,
          on_error: "skip",
        },
        next: null,
        branches: undefined,
        position: { x: 0, y: 240 },
      },
    ],
  },
];

// ── Route handlers ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "automations", "view");
  if (authErr) return authErr;

  return NextResponse.json({ templates: TEMPLATES });
}
