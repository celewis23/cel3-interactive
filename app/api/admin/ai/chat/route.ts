export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { createCustomer, listCustomers, listInvoices, listSubscriptions, getBalance } from "@/lib/stripe/billing";
import { createContact as createGoogleContact, searchContacts as searchGoogleContacts } from "@/lib/google/contacts";
import { sendEmail } from "@/lib/gmail/api";
import { slugify } from "@/lib/forms";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT_BASE = `You are a helpful AI assistant embedded in the CEL3 Interactive backoffice.
You can read and write data across the backoffice using tools.
Use tools whenever the user asks about real records or wants you to create, update, move, or send something.
If the user asks you to remember a personal fact or standing preference for future conversations, use the memory tools.
If a write request is missing required information, ask a concise follow-up instead of guessing.
Be concise and helpful.`;

const DEFAULT_PROJECT_COLUMNS = [
  { id: "backlog", name: "Backlog", taskIds: [] as string[] },
  { id: "in-progress", name: "In Progress", taskIds: [] as string[] },
  { id: "in-review", name: "In Review", taskIds: [] as string[] },
  { id: "done", name: "Done", taskIds: [] as string[] },
];

const DEFAULT_PIPELINE_STAGES = [
  { id: "new-lead", name: "New Lead" },
  { id: "contacted", name: "Contacted" },
  { id: "proposal", name: "Proposal Sent" },
  { id: "negotiating", name: "Negotiating" },
  { id: "won", name: "Won" },
  { id: "lost", name: "Lost" },
];

const FORM_FIELD_TYPES = new Set([
  "text", "textarea", "number", "email", "phone", "date",
  "dropdown", "checkbox", "radio", "file_upload", "section_header", "slider",
]);

const MEMORY_DOC_ID = "ai-assistant-memory";

function s(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function so(value: unknown): string | undefined {
  const cleaned = s(value);
  return cleaned || undefined;
}

function sa(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => s(item)).filter(Boolean) : [];
}

function n(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function escapeMatch(value: string): string {
  return value.replace(/"/g, '\\"');
}

function makeMatch(field: string, query: string): string {
  return `${field} match "*${escapeMatch(query)}*"`;
}

function textToHtml(text: string): string {
  return text.split("\n").map((line) => line.trimEnd()).join("<br />");
}

function makeFormField(field: Record<string, unknown>, sortOrder: number) {
  const id = crypto.randomUUID();
  const type = FORM_FIELD_TYPES.has(s(field.fieldType)) ? s(field.fieldType) : "text";
  return {
    id,
    _key: id,
    label: s(field.label) || `Field ${sortOrder + 1}`,
    fieldType: type,
    placeholder: s(field.placeholder),
    helpText: s(field.helpText),
    isRequired: Boolean(field.isRequired),
    options: sa(field.options),
    acceptedFileTypes: s(field.acceptedFileTypes) || "image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip",
    maxFileSizeMb: n(field.maxFileSizeMb, 10),
    sortOrder,
    sliderMin: n(field.sliderMin, 1),
    sliderMax: n(field.sliderMax, 10),
    sliderStep: n(field.sliderStep, 1),
    sliderUnit: s(field.sliderUnit),
    sliderMinLabel: s(field.sliderMinLabel),
    sliderMaxLabel: s(field.sliderMaxLabel),
  };
}

async function getMemoryFacts() {
  const memory = await sanityServer.fetch<{ facts?: Array<{ key: string; value: string }> } | null>(
    `*[_type == "aiAssistantMemory" && _id == $id][0]{ facts }`,
    { id: MEMORY_DOC_ID }
  );
  return memory?.facts ?? [];
}

async function saveMemoryFact(key: string, value: string) {
  const memory = await sanityServer.fetch<{ facts?: Array<{ _key?: string; key: string; value: string }> } | null>(
    `*[_type == "aiAssistantMemory" && _id == $id][0]{ facts }`,
    { id: MEMORY_DOC_ID }
  );
  const facts = (memory?.facts ?? []).filter((fact) => fact.key !== key);
  facts.push({ _key: crypto.randomUUID(), key, value });
  await sanityWriteClient.createOrReplace({ _id: MEMORY_DOC_ID, _type: "aiAssistantMemory", facts });
  return { key, value };
}

async function deleteMemoryFact(key: string) {
  const memory = await sanityServer.fetch<{ facts?: Array<{ _key?: string; key: string; value: string }> } | null>(
    `*[_type == "aiAssistantMemory" && _id == $id][0]{ facts }`,
    { id: MEMORY_DOC_ID }
  );
  const facts = (memory?.facts ?? []).filter((fact) => fact.key !== key);
  await sanityWriteClient.createOrReplace({ _id: MEMORY_DOC_ID, _type: "aiAssistantMemory", facts });
  return { deleted: true, key };
}

const TOOLS: Anthropic.Tool[] = [];

TOOLS.push(
  {
    name: "search_projects",
    description: "Search projects by name or status.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, status: { type: "string", enum: ["active", "completed", "archived"] }, limit: { type: "number" } } },
  },
  {
    name: "search_tasks",
    description: "Search project tasks by title or priority.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }, limit: { type: "number" } } },
  },
  {
    name: "search_contacts",
    description: "Search legacy Sanity CRM contacts by name, email, or company.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "search_pipeline_contacts",
    description: "Search pipeline leads by name, email, company, or stage.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, stage: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "search_google_contacts",
    description: "Search Google Contacts used by the backoffice contacts page.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] },
  },
  {
    name: "search_forms",
    description: "Search forms by title or slug.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "search_pipeline_stages",
    description: "List configured pipeline stages.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "search_invoices",
    description: "Search invoices by status, number, or client name.",
    input_schema: { type: "object" as const, properties: { status: { type: "string" }, query: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "search_expenses",
    description: "Search expenses by date range or text.",
    input_schema: { type: "object" as const, properties: { from: { type: "string" }, to: { type: "string" }, query: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "search_contracts",
    description: "Search contracts by title, client, or status.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, status: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "search_estimates",
    description: "Search estimates by title, client, or status.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, status: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "search_staff",
    description: "Search staff members.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "search_assets",
    description: "Search the asset library.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, fileType: { type: "string", enum: ["image", "video", "pdf", "doc", "spreadsheet", "font", "zip"] }, tag: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "search_time_entries",
    description: "Search time entries by date range or project.",
    input_schema: { type: "object" as const, properties: { from: { type: "string" }, to: { type: "string" }, projectId: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "search_announcements",
    description: "Search announcements.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "search_audit_log",
    description: "Search recent audit events.",
    input_schema: { type: "object" as const, properties: { action: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "get_dashboard_summary",
    description: "Get a summary of projects, invoices, leads, and recent activity.",
    input_schema: { type: "object" as const, properties: {} },
  }
);

async function createProjectWithTasks(input: Record<string, unknown>) {
  const name = s(input.name);
  if (!name) throw new Error("Project name is required");

  const project = await sanityWriteClient.create({
    _type: "pmProject",
    name,
    description: s(input.description),
    status: s(input.status) || "active",
    dueDate: so(input.dueDate) ?? null,
    clientRef: so(input.clientRef) ?? null,
    columns: DEFAULT_PROJECT_COLUMNS,
    calendarEventId: null,
  });

  const tasks = Array.isArray(input.tasks) ? input.tasks : [];
  const taskIdsByColumn = new Map(DEFAULT_PROJECT_COLUMNS.map((column) => [column.id, [] as string[]]));
  const createdTasks: Array<Record<string, unknown>> = [];

  for (const rawTask of tasks) {
    if (!rawTask || typeof rawTask !== "object") continue;
    const task = rawTask as Record<string, unknown>;
    const title = s(task.title);
    if (!title) continue;
    const columnId = taskIdsByColumn.has(s(task.columnId)) ? s(task.columnId) : "backlog";
    const createdTask = await sanityWriteClient.create({
      _type: "pmTask",
      projectId: project._id,
      columnId,
      title,
      description: s(task.description),
      priority: s(task.priority) || "medium",
      dueDate: so(task.dueDate) ?? null,
      assignee: so(task.assignee) ?? null,
      clientRef: so(input.clientRef) ?? null,
      driveFileId: null,
      driveFileUrl: null,
      driveFileName: null,
    });
    taskIdsByColumn.get(columnId)?.push(createdTask._id);
    createdTasks.push(createdTask as Record<string, unknown>);
  }

  if (createdTasks.length > 0) {
    await sanityWriteClient.patch(project._id).set({
      columns: DEFAULT_PROJECT_COLUMNS.map((column) => ({ ...column, taskIds: taskIdsByColumn.get(column.id) ?? [] })),
    }).commit();
  }

  return { ...project, tasks: createdTasks };
}

async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  const limit = n(input.limit, 10);
  const query = s(input.query);

  switch (name) {
    case "search_projects": {
      const filters = [`_type == "pmProject"`];
      if (input.status) filters.push(`status == "${s(input.status)}"`);
      if (query) filters.push(makeMatch("name", query));
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, name, status, description, dueDate, clientRef, columns, _createdAt }`);
    }
    case "search_tasks": {
      const filters = [`_type == "pmTask"`];
      if (input.priority) filters.push(`priority == "${s(input.priority)}"`);
      if (query) filters.push(makeMatch("title", query));
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, projectId, columnId, title, description, priority, assignee, dueDate, _createdAt }`);
    }
    case "search_contacts": {
      const filters = [`_type == "contact"`];
      if (query) filters.push(`(${makeMatch("name", query)} || ${makeMatch("email", query)} || ${makeMatch("company", query)})`);
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, name, email, phone, company, stage, _createdAt }`);
    }
    case "search_pipeline_contacts": {
      const filters = [`_type == "pipelineContact"`];
      if (input.stage) filters.push(`stage == "${s(input.stage)}"`);
      if (query) filters.push(`(${makeMatch("name", query)} || ${makeMatch("email", query)} || ${makeMatch("company", query)} || ${makeMatch("stage", query)})`);
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(stageEnteredAt desc) [0...${limit}] { _id, name, email, phone, company, source, owner, notes, stage, stageEnteredAt, estimatedValue, stripeCustomerId, _createdAt }`);
    }
    case "search_google_contacts":
      return (await searchGoogleContacts(query)).slice(0, limit);
    case "search_forms": {
      const filters = [`_type == "cel3Form"`];
      if (query) filters.push(`(${makeMatch("title", query)} || ${makeMatch("slug", query)})`);
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, title, description, slug, isPublic, isActive, fields, _createdAt, _updatedAt }`);
    }
    case "search_pipeline_stages": {
      const config = await sanityServer.fetch<{ stages?: Array<{ id: string; name: string }> } | null>(`*[_type == "pipelineConfig" && _id == "pipeline-config"][0]{ stages }`);
      return { stages: config?.stages ?? DEFAULT_PIPELINE_STAGES };
    }
    case "search_invoices": {
      const filters = [`_type == "invoice"`];
      if (input.status) filters.push(`status == "${s(input.status)}"`);
      if (query) filters.push(`(${makeMatch("number", query)} || ${makeMatch("clientName", query)})`);
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, number, status, amountCents, currency, clientName, dueDate, _createdAt }`);
    }
    case "search_expenses": {
      const filters = [`_type == "expense"`];
      if (input.from) filters.push(`date >= "${s(input.from)}"`);
      if (input.to) filters.push(`date <= "${s(input.to)}"`);
      if (query) filters.push(`(${makeMatch("vendor", query)} || ${makeMatch("description", query)})`);
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(date desc) [0...${limit}] { _id, date, amountCents, currency, vendor, description, categoryId, _createdAt }`);
    }
    case "search_contracts": {
      const filters = [`_type == "contract"`];
      if (input.status) filters.push(`status == "${s(input.status)}"`);
      if (query) filters.push(`(${makeMatch("title", query)} || ${makeMatch("clientName", query)})`);
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, title, status, clientName, value, signedAt, _createdAt }`);
    }
    case "search_estimates": {
      const filters = [`_type == "estimate"`];
      if (input.status) filters.push(`status == "${s(input.status)}"`);
      if (query) filters.push(`(${makeMatch("title", query)} || ${makeMatch("clientName", query)})`);
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, title, status, clientName, totalCents, _createdAt }`);
    }
    case "search_staff": {
      const filters = [`_type == "staffMember"`];
      if (query) filters.push(`(${makeMatch("name", query)} || ${makeMatch("email", query)})`);
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(name asc) [0...${limit}] { _id, name, email, roleSlug, isActive, _createdAt }`);
    }
    case "search_assets": {
      const filters = [`_type == "assetItem"`];
      if (input.fileType) filters.push(`fileType == "${s(input.fileType)}"`);
      if (input.tag) filters.push(`"${s(input.tag)}" in tags`);
      if (query) filters.push(makeMatch("name", query));
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, name, fileUrl, fileType, mimeType, sizeBytes, tags, _createdAt }`);
    }
    case "search_time_entries": {
      const filters = [`_type == "timeEntry"`];
      if (input.from) filters.push(`date >= "${s(input.from)}"`);
      if (input.to) filters.push(`date <= "${s(input.to)}"`);
      if (input.projectId) filters.push(`projectId == "${s(input.projectId)}"`);
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(date desc) [0...${limit}] { _id, date, durationMinutes, description, projectId, staffId, _createdAt }`);
    }
    case "search_announcements": {
      const filters = [`_type == "announcement"`];
      if (query) filters.push(`(${makeMatch("title", query)} || ${makeMatch("body", query)})`);
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, title, body, authorName, _createdAt }`);
    }
    case "search_audit_log": {
      const filters = [`_type == "auditEvent"`];
      if (input.action) filters.push(`action == "${s(input.action)}"`);
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(timestamp desc) [0...${limit}] { _id, action, userName, description, resourceType, resourceLabel, timestamp }`);
    }
    case "get_dashboard_summary": {
      const [projects, openInvoices, recentAudit, leads] = await Promise.all([
        sanityServer.fetch<number>(`count(*[_type == "pmProject" && status == "active"])`),
        sanityServer.fetch<number>(`count(*[_type == "invoice" && status == "open"])`),
        sanityServer.fetch(`*[_type == "auditEvent"] | order(timestamp desc) [0...5] { action, userName, description, timestamp }`),
        sanityServer.fetch<number>(`count(*[_type == "pipelineContact"])`),
      ]);
      return { activeProjects: projects, openInvoices, totalPipelineContacts: leads, recentActivity: recentAudit };
    }
    case "create_task": {
      const projectId = s(input.projectId);
      const columnId = s(input.columnId);
      const title = s(input.title);
      if (!projectId || !columnId || !title) throw new Error("projectId, columnId, and title are required");

      const project = await sanityServer.fetch<{ columns?: Array<{ id: string; taskIds?: string[] }> } | null>(
        `*[_type == "pmProject" && _id == $id][0]{ columns }`,
        { id: projectId }
      );
      if (!project) throw new Error("Project not found");

      const task = await sanityWriteClient.create({
        _type: "pmTask",
        projectId,
        columnId,
        title,
        description: s(input.description),
        priority: s(input.priority) || "medium",
        dueDate: so(input.dueDate) ?? null,
        assignee: so(input.assignee) ?? null,
        clientRef: so(input.clientRef) ?? null,
        driveFileId: null,
        driveFileUrl: null,
        driveFileName: null,
      });

      if (project.columns?.length) {
        await sanityWriteClient.patch(projectId).set({
          columns: project.columns.map((column) =>
            column.id === columnId ? { ...column, taskIds: [...(column.taskIds ?? []), task._id] } : column
          ),
        }).commit();
      }

      return task;
    }
    case "create_project":
      return createProjectWithTasks(input);
    case "create_form": {
      const title = s(input.title);
      if (!title) throw new Error("Form title is required");
      const finalSlug = s(input.slug) || slugify(title);
      if (!finalSlug) throw new Error("Form slug is required");

      const existing = await sanityServer.fetch<string | null>(`*[_type == "cel3Form" && slug == $slug][0]._id`, { slug: finalSlug });
      if (existing) throw new Error(`Form slug "${finalSlug}" is already in use`);

      const fields = (Array.isArray(input.fields) ? input.fields : [])
        .filter((field): field is Record<string, unknown> => Boolean(field) && typeof field === "object")
        .map((field, index) => makeFormField(field, index));

      return sanityWriteClient.create({
        _type: "cel3Form",
        title,
        description: s(input.description),
        slug: finalSlug,
        isPublic: typeof input.isPublic === "boolean" ? input.isPublic : false,
        isActive: typeof input.isActive === "boolean" ? input.isActive : true,
        fields,
      });
    }
    case "create_client": {
      const name = s(input.name);
      if (!name) throw new Error("Client name is required");
      return createCustomer({ name, email: so(input.email), phone: so(input.phone), description: so(input.description) });
    }
    case "create_google_contact": {
      if (!so(input.givenName) && !so(input.familyName)) throw new Error("givenName or familyName is required");
      return createGoogleContact({
        givenName: so(input.givenName),
        familyName: so(input.familyName),
        emails: sa(input.emails),
        phones: sa(input.phones),
        organization: so(input.organization),
        notes: so(input.notes),
      });
    }
    case "create_contact": {
      const name = s(input.name);
      if (!name) throw new Error("Contact name is required");
      return sanityWriteClient.create({
        _type: "contact",
        name,
        email: so(input.email) ?? null,
        phone: so(input.phone) ?? null,
        company: so(input.company) ?? null,
        notes: so(input.notes) ?? null,
        createdAt: new Date().toISOString(),
      });
    }
    case "create_pipeline_contact": {
      const name = s(input.name);
      if (!name) throw new Error("Lead name is required");
      const stage = s(input.stage) || "new-lead";
      const now = new Date().toISOString();
      const created = await sanityWriteClient.create({
        _type: "pipelineContact",
        name,
        email: so(input.email) ?? null,
        phone: so(input.phone) ?? null,
        company: so(input.company) ?? null,
        source: so(input.source) ?? null,
        notes: so(input.notes) ?? null,
        owner: so(input.owner) ?? null,
        stage,
        stageEnteredAt: now,
        estimatedValue: typeof input.estimatedValue === "number" ? input.estimatedValue : null,
        stripeCustomerId: null,
        closedAt: null,
        driveFileUrl: null,
        driveFileName: null,
        followUpEventId: null,
      });
      await sanityWriteClient.create({ _type: "pipelineActivity", contactId: created._id, type: "created", text: "Contact created", fromStage: null, toStage: stage, author: "AI Assistant" });
      return created;
    }
    case "move_pipeline_contact": {
      const contactId = s(input.contactId);
      const stage = s(input.stage);
      if (!contactId || !stage) throw new Error("contactId and stage are required");
      const current = await sanityServer.fetch<{ stage: string } | null>(`*[_type == "pipelineContact" && _id == $id][0]{ stage }`, { id: contactId });
      if (!current) throw new Error("Pipeline contact not found");

      const patch: Record<string, unknown> = { stage, stageEnteredAt: new Date().toISOString() };
      if (input.notes !== undefined) patch.notes = so(input.notes) ?? null;
      if (input.owner !== undefined) patch.owner = so(input.owner) ?? null;
      if (typeof input.estimatedValue === "number") patch.estimatedValue = input.estimatedValue;
      if (stage === "won" || stage === "lost") patch.closedAt = new Date().toISOString();

      const updated = await sanityWriteClient.patch(contactId).set(patch).commit();
      await sanityWriteClient.create({ _type: "pipelineActivity", contactId, type: "stage_change", text: `Moved from ${current.stage} to ${stage}`, fromStage: current.stage, toStage: stage, author: "AI Assistant" });
      return updated;
    }
    case "send_email": {
      const to = s(input.to);
      const subject = s(input.subject);
      const body = s(input.body);
      const htmlBody = s(input.htmlBody);
      if (!to || !subject) throw new Error("to and subject are required");
      if (!body && !htmlBody) throw new Error("body or htmlBody is required");
      return sendEmail({ to, cc: so(input.cc), bcc: so(input.bcc), subject, body: body || undefined, htmlBody: htmlBody || textToHtml(body) });
    }
    case "view_memory":
      return { facts: await getMemoryFacts() };
    case "remember_fact": {
      const key = s(input.key);
      const value = s(input.value);
      if (!key || !value) throw new Error("key and value are required");
      return saveMemoryFact(key, value);
    }
    case "forget_fact": {
      const key = s(input.key);
      if (!key) throw new Error("key is required");
      return deleteMemoryFact(key);
    }
    case "get_stripe_balance":
      return getBalance();
    case "search_stripe_customers":
      return listCustomers({ limit: n(input.limit, 20), email: so(input.email) });
    case "search_stripe_invoices":
      return listInvoices({ status: so(input.status) as import("stripe").Stripe.Invoice.Status | undefined, customerId: so(input.customerId), limit: n(input.limit, 20) });
    case "search_stripe_subscriptions":
      return listSubscriptions({ status: so(input.status), customerId: so(input.customerId), limit: n(input.limit, 20) });
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "aiAssistant", "view");
  if (authErr) return authErr;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured. Add it to your .env.local file." }, { status: 503 });
  }

  try {
    const body = await req.json() as { messages: Anthropic.MessageParam[] };
    const messages = body.messages ?? [];
    if (!messages.length) return NextResponse.json({ error: "messages required" }, { status: 400 });

    const memoryFacts = await getMemoryFacts();
    const memoryPrompt = memoryFacts.length
      ? `Saved memory facts:\n${memoryFacts.map((fact) => `- ${fact.key}: ${fact.value}`).join("\n")}`
      : "Saved memory facts: none";
    const systemPrompt = `${SYSTEM_PROMPT_BASE}\n${memoryPrompt}\nToday's date is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;

    let response = await client.messages.create({ model: "claude-sonnet-4-6", max_tokens: 4096, system: systemPrompt, messages, tools: TOOLS });
    const loopMessages: Anthropic.MessageParam[] = [...messages];
    let iterations = 0;

    while (response.stop_reason === "tool_use" && iterations < 10) {
      iterations++;
      const toolUseBlocks = response.content.filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
      const toolResults = await Promise.all(toolUseBlocks.map(async (block) => {
        try {
          const result = await executeTool(block.name, block.input as Record<string, unknown>);
          return { type: "tool_result" as const, tool_use_id: block.id, content: JSON.stringify(result, null, 2) };
        } catch (err) {
          return { type: "tool_result" as const, tool_use_id: block.id, content: `Error: ${err instanceof Error ? err.message : String(err)}`, is_error: true };
        }
      }));

      loopMessages.push({ role: "assistant", content: response.content }, { role: "user", content: toolResults });
      response = await client.messages.create({ model: "claude-sonnet-4-6", max_tokens: 4096, system: systemPrompt, messages: loopMessages, tools: TOOLS });
    }

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
    return NextResponse.json({ response: textBlock?.text ?? "Done." });
  } catch (err) {
    console.error("AI_CHAT_ERR:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI request failed" }, { status: 500 });
  }
}

TOOLS.push(
  {
    name: "create_task",
    description: "Create a task inside an existing project and column.",
    input_schema: { type: "object" as const, properties: { projectId: { type: "string" }, columnId: { type: "string" }, title: { type: "string" }, description: { type: "string" }, priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }, dueDate: { type: "string" }, assignee: { type: "string" }, clientRef: { type: "string" } }, required: ["projectId", "columnId", "title"] },
  },
  {
    name: "create_project",
    description: "Create a project and optionally initial tasks.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        dueDate: { type: "string" },
        clientRef: { type: "string" },
        status: { type: "string", enum: ["active", "completed", "archived"] },
        tasks: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }, columnId: { type: "string" }, dueDate: { type: "string" }, assignee: { type: "string" } }, required: ["title"] } },
      },
      required: ["name"],
    },
  },
  {
    name: "create_form",
    description: "Create a form and optionally its fields.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        slug: { type: "string" },
        description: { type: "string" },
        isPublic: { type: "boolean" },
        isActive: { type: "boolean" },
        fields: { type: "array", items: { type: "object", properties: { label: { type: "string" }, fieldType: { type: "string", enum: ["text", "textarea", "number", "email", "phone", "date", "dropdown", "checkbox", "radio", "file_upload", "section_header", "slider"] }, placeholder: { type: "string" }, helpText: { type: "string" }, isRequired: { type: "boolean" }, options: { type: "array", items: { type: "string" } }, acceptedFileTypes: { type: "string" }, maxFileSizeMb: { type: "number" }, sliderMin: { type: "number" }, sliderMax: { type: "number" }, sliderStep: { type: "number" }, sliderUnit: { type: "string" }, sliderMinLabel: { type: "string" }, sliderMaxLabel: { type: "string" } } } },
      },
      required: ["title"],
    },
  },
  {
    name: "create_client",
    description: "Create a Stripe customer client.",
    input_schema: { type: "object" as const, properties: { name: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, description: { type: "string" } }, required: ["name"] },
  },
  {
    name: "create_google_contact",
    description: "Create a Google Contact.",
    input_schema: { type: "object" as const, properties: { givenName: { type: "string" }, familyName: { type: "string" }, emails: { type: "array", items: { type: "string" } }, phones: { type: "array", items: { type: "string" } }, organization: { type: "string" }, notes: { type: "string" } } },
  },
  {
    name: "create_contact",
    description: "Create a legacy Sanity CRM contact.",
    input_schema: { type: "object" as const, properties: { name: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, company: { type: "string" }, notes: { type: "string" } }, required: ["name"] },
  },
  {
    name: "create_pipeline_contact",
    description: "Create a lead in the pipeline.",
    input_schema: { type: "object" as const, properties: { name: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, company: { type: "string" }, source: { type: "string" }, notes: { type: "string" }, owner: { type: "string" }, stage: { type: "string" }, estimatedValue: { type: "number" } }, required: ["name"] },
  },
  {
    name: "move_pipeline_contact",
    description: "Move a lead to a new pipeline stage.",
    input_schema: { type: "object" as const, properties: { contactId: { type: "string" }, stage: { type: "string" }, notes: { type: "string" }, owner: { type: "string" }, estimatedValue: { type: "number" } }, required: ["contactId", "stage"] },
  },
  {
    name: "send_email",
    description: "Compose and send an email from the connected Gmail account.",
    input_schema: { type: "object" as const, properties: { to: { type: "string" }, cc: { type: "string" }, bcc: { type: "string" }, subject: { type: "string" }, body: { type: "string" }, htmlBody: { type: "string" } }, required: ["to", "subject"] },
  },
  {
    name: "view_memory",
    description: "View saved assistant memory facts such as user name or preferences.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "remember_fact",
    description: "Save a durable memory fact for future conversations.",
    input_schema: { type: "object" as const, properties: { key: { type: "string" }, value: { type: "string" } }, required: ["key", "value"] },
  },
  {
    name: "forget_fact",
    description: "Delete a saved memory fact.",
    input_schema: { type: "object" as const, properties: { key: { type: "string" } }, required: ["key"] },
  },
  {
    name: "get_stripe_balance",
    description: "Get the current Stripe account balance.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "search_stripe_customers",
    description: "Search Stripe customers by email.",
    input_schema: { type: "object" as const, properties: { email: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "search_stripe_invoices",
    description: "Search Stripe invoices by status or customer ID.",
    input_schema: { type: "object" as const, properties: { status: { type: "string", enum: ["draft", "open", "paid", "void", "uncollectible"] }, customerId: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "search_stripe_subscriptions",
    description: "Search Stripe subscriptions by status or customer ID.",
    input_schema: { type: "object" as const, properties: { status: { type: "string" }, customerId: { type: "string" }, limit: { type: "number" } } },
  }
);
