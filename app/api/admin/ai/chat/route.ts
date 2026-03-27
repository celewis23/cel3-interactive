export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { createCustomer, listCustomers, listInvoices, listSubscriptions, getBalance } from "@/lib/stripe/billing";
import { createContact as createGoogleContact, searchContacts as searchGoogleContacts } from "@/lib/google/contacts";
import { sendEmail, listThreads } from "@/lib/gmail/api";
import { listEvents, createEvent } from "@/lib/google/calendar";
import { listFiles, createFolder } from "@/lib/google/drive";
import { listSpaces, listMessages, sendMessage as chatSendMessage } from "@/lib/google/chat";
import { listUpcomingMeetings, createMeeting as googleCreateMeeting } from "@/lib/google/meet";
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

    // ── Bookings ─────────────────────────────────────────────────────────────
    case "search_bookings": {
      const filters = [`_type == "assessmentBooking"`];
      if (input.status) filters.push(`status == "${s(input.status)}"`);
      if (query) filters.push(`(${makeMatch("name", query)} || ${makeMatch("email", query)})`);
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, name, email, phone, status, date, notes, _createdAt }`);
    }

    // ── Calendar ─────────────────────────────────────────────────────────────
    case "search_calendar_events":
      return listEvents({
        calendarId: "primary",
        q: so(query),
        timeMin: so(input.from as string) ?? new Date().toISOString(),
        timeMax: so(input.to as string),
        maxResults: n(input.maxResults, 20),
      });
    case "create_calendar_event": {
      const start = s(input.start);
      const end = s(input.end);
      const summary = s(input.summary);
      if (!start || !end || !summary) throw new Error("summary, start, and end are required");
      const attendees = (Array.isArray(input.attendees) ? input.attendees as string[] : []).map((email) => ({ email }));
      return createEvent("primary", {
        summary,
        description: so(input.description),
        start: { dateTime: start },
        end: { dateTime: end },
        attendees: attendees.length ? attendees : undefined,
      });
    }

    // ── Case Studies ─────────────────────────────────────────────────────────
    case "search_case_studies": {
      const filters = [`_type == "project"`];
      if (query) filters.push(`(${makeMatch("title", query)} || ${makeMatch("client", query)})`);
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(featured desc, _createdAt desc) [0...${limit}] { _id, title, client, slug, featured, tags, _createdAt }`);
    }

    // ── Form Submissions ─────────────────────────────────────────────────────
    case "get_form_submissions": {
      let formId = s(input.formId);
      if (!formId && input.slug) {
        const found = await sanityServer.fetch<{ _id: string } | null>(`*[_type == "cel3Form" && slug == $slug][0]{ _id }`, { slug: s(input.slug) });
        formId = found?._id ?? "";
      }
      if (!formId) throw new Error("formId or slug is required");
      return sanityServer.fetch(`*[_type == "formSubmission" && formId == $formId] | order(_createdAt desc) [0...${limit}] { _id, formId, data, submittedAt, _createdAt }`, { formId });
    }

    // ── Onboarding ───────────────────────────────────────────────────────────
    case "search_onboarding": {
      const docType = s(input.type) === "template" ? "onboardingTemplate" : "onboardingInstance";
      const filters = [`_type == "${docType}"`];
      if (query) filters.push(makeMatch("name", query));
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, name, status, steps, _createdAt }`);
    }

    // ── Pins ─────────────────────────────────────────────────────────────────
    case "search_pins": {
      const filters = input.category ? [`_type == "pin" && category == "${s(input.category)}"`] : [`_type == "pin"`];
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(order asc) [0...${limit}] { _id, title, url, description, category, color, order, _createdAt }`);
    }
    case "create_pin": {
      const title = s(input.title);
      if (!title) throw new Error("title is required");
      const maxOrder = await sanityServer.fetch<number>(`coalesce(max(*[_type == "pin"].order), 0)`);
      return sanityWriteClient.create({
        _type: "pin",
        title,
        url: so(input.url) ?? null,
        description: so(input.description) ?? null,
        category: so(input.category) ?? null,
        color: so(input.color) ?? null,
        order: (maxOrder ?? 0) + 1,
      });
    }

    // ── Portal Users ─────────────────────────────────────────────────────────
    case "search_portal_users": {
      const filters = [`_type == "clientPortalUser"`];
      if (query) filters.push(`(${makeMatch("name", query)} || ${makeMatch("email", query)})`);
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, name, email, stripeCustomerId, isActive, _createdAt }`);
    }

    // ── Google Drive ─────────────────────────────────────────────────────────
    case "search_drive_files":
      return listFiles({
        search: so(query),
        folderId: so(input.folderId as string),
        pageSize: n(input.limit, 20),
      });
    case "create_drive_folder": {
      const name = s(input.name);
      if (!name) throw new Error("name is required");
      return createFolder(name, so(input.parentFolderId));
    }

    // ── Email Threads ─────────────────────────────────────────────────────────
    case "search_email_threads":
      return listThreads({
        labelIds: [s(input.label) || "INBOX"],
        q: so(query),
        maxResults: n(input.maxResults, 20),
      });

    // ── Google Chat ───────────────────────────────────────────────────────────
    case "list_chat_spaces":
      return listSpaces();
    case "search_chat_messages":
      return listMessages(s(input.spaceName));
    case "send_chat_message":
      return chatSendMessage(s(input.spaceName), s(input.text));

    // ── Google Meet ───────────────────────────────────────────────────────────
    case "list_meetings":
      return listUpcomingMeetings({ maxResults: n(input.maxResults, 10) });
    case "create_meeting": {
      const title = s(input.title);
      const startTime = s(input.startTime);
      const endTime = s(input.endTime);
      if (!title || !startTime || !endTime) throw new Error("title, startTime, and endTime are required");
      return googleCreateMeeting({
        summary: title,
        startDateTime: startTime,
        endDateTime: endTime,
        attendeeEmails: Array.isArray(input.attendeeEmails) ? input.attendeeEmails as string[] : [],
        description: so(input.description),
      });
    }

    // ── Reports ───────────────────────────────────────────────────────────────
    case "get_expense_report": {
      const expFilters = [`_type == "expense"`];
      if (input.from) expFilters.push(`date >= "${s(input.from)}"`);
      if (input.to) expFilters.push(`date <= "${s(input.to)}"`);
      const [expenses, categories] = await Promise.all([
        sanityServer.fetch<Array<{ amountCents: number; currency: string; categoryId: string; date: string }>>(
          `*[${expFilters.join(" && ")}] { amountCents, currency, categoryId, date }`
        ),
        sanityServer.fetch<Array<{ _id: string; name: string }>>(`*[_type == "expenseCategory"] { _id, name }`),
      ]);
      const categoryMap = Object.fromEntries(categories.map((c) => [c._id, c.name]));
      const totalCents = expenses.reduce((sum, e) => sum + (e.amountCents ?? 0), 0);
      const byCategory: Record<string, number> = {};
      for (const e of expenses) {
        const cat = categoryMap[e.categoryId] ?? "Uncategorised";
        byCategory[cat] = (byCategory[cat] ?? 0) + (e.amountCents ?? 0);
      }
      return { totalCents, totalFormatted: `$${(totalCents / 100).toFixed(2)}`, count: expenses.length, byCategory };
    }
    case "get_time_report": {
      const timeFilters = [`_type == "timeEntry"`];
      if (input.from) timeFilters.push(`date >= "${s(input.from)}"`);
      if (input.to) timeFilters.push(`date <= "${s(input.to)}"`);
      if (input.projectId) timeFilters.push(`projectId == "${s(input.projectId)}"`);
      const entries = await sanityServer.fetch<Array<{ durationMinutes: number; projectId: string; date: string }>>(
        `*[${timeFilters.join(" && ")}] { durationMinutes, projectId, date }`
      );
      const totalMinutes = entries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
      const byProject: Record<string, number> = {};
      for (const e of entries) {
        byProject[e.projectId ?? "Unknown"] = (byProject[e.projectId ?? "Unknown"] ?? 0) + (e.durationMinutes ?? 0);
      }
      return { totalMinutes, totalHours: +(totalMinutes / 60).toFixed(2), count: entries.length, byProject };
    }

    // ── Automations ───────────────────────────────────────────────────────────
    case "search_automations": {
      const filters = [`_type == "automation"`];
      if (typeof input.isEnabled === "boolean") filters.push(`isEnabled == ${input.isEnabled}`);
      if (query) filters.push(makeMatch("name", query));
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(_updatedAt desc) [0...${limit}] { _id, name, triggerType, isEnabled, _createdAt, _updatedAt }`);
    }

    // ── Expense Categories & Recurring ────────────────────────────────────────
    case "search_expense_categories":
      return sanityServer.fetch(`*[_type == "expenseCategory"] | order(name asc) { _id, name, color, icon }`);
    case "search_recurring_expenses":
      return sanityServer.fetch(`*[_type == "recurringExpense"] | order(_createdAt desc) [0...${limit}] { _id, vendor, description, amountCents, currency, categoryId, frequency, nextDueDate, isActive, _createdAt }`);
    case "create_expense": {
      const date = s(input.date);
      const amountCents = n(input.amountCents, 0);
      const vendor = s(input.vendor);
      if (!date || !vendor || amountCents <= 0) throw new Error("date, amountCents (>0), and vendor are required");
      return sanityWriteClient.create({
        _type: "expense",
        date,
        amountCents,
        currency: s(input.currency) || "usd",
        vendor,
        description: so(input.description) ?? null,
        categoryId: so(input.categoryId) ?? null,
      });
    }

    // ── Contract Templates ────────────────────────────────────────────────────
    case "search_contract_templates": {
      const filters = [`_type == "contractTemplate"`];
      if (query) filters.push(`(${makeMatch("name", query)} || ${makeMatch("category", query)})`);
      return sanityServer.fetch(`*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, name, category, _createdAt }`);
    }

    // ── Roles ─────────────────────────────────────────────────────────────────
    case "search_roles":
      return sanityServer.fetch(`*[_type == "staffRole"] | order(name asc) { _id, name, slug, permissions, _createdAt }`);

    // ── Site Settings ─────────────────────────────────────────────────────────
    case "get_site_settings":
      return sanityServer.fetch(`*[_id == "siteSettings"][0]`);

    // ── Announcements (write) ─────────────────────────────────────────────────
    case "create_announcement": {
      const title = s(input.title);
      const body = s(input.body);
      if (!title || !body) throw new Error("title and body are required");
      return sanityWriteClient.create({
        _type: "announcement",
        title,
        body,
        authorName: so(input.authorName) ?? "AI Assistant",
        _createdAt: new Date().toISOString(),
      });
    }

    // ── Mutations ─────────────────────────────────────────────────────────────
    case "update_task": {
      const taskId = s(input.taskId);
      if (!taskId) throw new Error("taskId is required");
      const patch: Record<string, unknown> = {};
      if (input.title !== undefined) patch.title = s(input.title);
      if (input.description !== undefined) patch.description = s(input.description);
      if (input.priority !== undefined) patch.priority = s(input.priority);
      if (input.columnId !== undefined) patch.columnId = s(input.columnId);
      if (input.dueDate !== undefined) patch.dueDate = so(input.dueDate) ?? null;
      if (input.assignee !== undefined) patch.assignee = so(input.assignee) ?? null;
      return sanityWriteClient.patch(taskId).set(patch).commit();
    }
    case "update_project": {
      const projectId = s(input.projectId);
      if (!projectId) throw new Error("projectId is required");
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = s(input.name);
      if (input.description !== undefined) patch.description = s(input.description);
      if (input.status !== undefined) patch.status = s(input.status);
      if (input.dueDate !== undefined) patch.dueDate = so(input.dueDate) ?? null;
      return sanityWriteClient.patch(projectId).set(patch).commit();
    }
    case "update_contract": {
      const contractId = s(input.contractId);
      if (!contractId) throw new Error("contractId is required");
      const patch: Record<string, unknown> = {};
      if (input.status !== undefined) patch.status = s(input.status);
      if (input.notes !== undefined) patch.notes = s(input.notes);
      if (input.expiryDate !== undefined) patch.expiryDate = so(input.expiryDate) ?? null;
      const now = new Date().toISOString();
      if (s(input.status) === "sent") patch.sentAt = now;
      if (s(input.status) === "signed") patch.signedAt = now;
      if (s(input.status) === "declined") patch.declinedAt = now;
      if (s(input.status) === "expired") patch.expiredAt = now;
      return sanityWriteClient.patch(contractId).set(patch).commit();
    }

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
  },

  // ── Bookings ───────────────────────────────────────────────────────────────
  {
    name: "search_bookings",
    description: "Search/list assessment bookings.",
    input_schema: { type: "object" as const, properties: { query: { type: "string", description: "Filter by name or email" }, status: { type: "string" }, limit: { type: "number" } } },
  },

  // ── Calendar ───────────────────────────────────────────────────────────────
  {
    name: "search_calendar_events",
    description: "List upcoming Google Calendar events, optionally filtered by date range or search term.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, from: { type: "string", description: "ISO date/datetime start" }, to: { type: "string", description: "ISO date/datetime end" }, maxResults: { type: "number" } } },
  },
  {
    name: "create_calendar_event",
    description: "Create a Google Calendar event.",
    input_schema: { type: "object" as const, properties: { summary: { type: "string" }, description: { type: "string" }, start: { type: "string", description: "ISO datetime" }, end: { type: "string", description: "ISO datetime" }, attendees: { type: "array", items: { type: "string" }, description: "Email addresses" } }, required: ["summary", "start", "end"] },
  },

  // ── Case Studies ───────────────────────────────────────────────────────────
  {
    name: "search_case_studies",
    description: "Search portfolio/case study projects.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, limit: { type: "number" } } },
  },

  // ── Form Submissions ───────────────────────────────────────────────────────
  {
    name: "get_form_submissions",
    description: "Get submissions for a specific form by its ID or slug.",
    input_schema: { type: "object" as const, properties: { formId: { type: "string", description: "Sanity form _id" }, slug: { type: "string", description: "Form slug (used if formId not provided)" }, limit: { type: "number" } }, required: [] },
  },

  // ── Onboarding ─────────────────────────────────────────────────────────────
  {
    name: "search_onboarding",
    description: "Search onboarding instances or templates.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, type: { type: "string", enum: ["instance", "template"], description: "Defaults to instance" }, limit: { type: "number" } } },
  },

  // ── Pins ───────────────────────────────────────────────────────────────────
  {
    name: "search_pins",
    description: "List quick-access pins/notes, optionally filtered by category.",
    input_schema: { type: "object" as const, properties: { category: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "create_pin",
    description: "Create a quick-access pin/note.",
    input_schema: { type: "object" as const, properties: { title: { type: "string" }, url: { type: "string" }, description: { type: "string" }, category: { type: "string" }, color: { type: "string" } }, required: ["title"] },
  },

  // ── Portal Users ───────────────────────────────────────────────────────────
  {
    name: "search_portal_users",
    description: "Search client portal user accounts.",
    input_schema: { type: "object" as const, properties: { query: { type: "string", description: "Filter by name or email" }, limit: { type: "number" } } },
  },

  // ── Google Drive ───────────────────────────────────────────────────────────
  {
    name: "search_drive_files",
    description: "Search Google Drive files by name or type.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, mimeType: { type: "string", description: "MIME type filter, e.g. application/pdf" }, folderId: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "create_drive_folder",
    description: "Create a new Google Drive folder.",
    input_schema: { type: "object" as const, properties: { name: { type: "string" }, parentFolderId: { type: "string" } }, required: ["name"] },
  },

  // ── Email Threads ──────────────────────────────────────────────────────────
  {
    name: "search_email_threads",
    description: "Search Gmail inbox threads by keyword or label.",
    input_schema: { type: "object" as const, properties: { query: { type: "string", description: "Gmail search query, e.g. 'from:john@example.com'" }, label: { type: "string", description: "Gmail label, e.g. INBOX, SENT, STARRED" }, maxResults: { type: "number" } } },
  },

  // ── Google Chat ────────────────────────────────────────────────────────────
  {
    name: "list_chat_spaces",
    description: "List Google Chat spaces and DMs.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "search_chat_messages",
    description: "List messages in a Google Chat space.",
    input_schema: { type: "object" as const, properties: { spaceName: { type: "string", description: "Space name, e.g. spaces/XXXXX" }, limit: { type: "number" } }, required: ["spaceName"] },
  },
  {
    name: "send_chat_message",
    description: "Send a message to a Google Chat space or DM.",
    input_schema: { type: "object" as const, properties: { spaceName: { type: "string" }, text: { type: "string" } }, required: ["spaceName", "text"] },
  },

  // ── Google Meet ────────────────────────────────────────────────────────────
  {
    name: "list_meetings",
    description: "List upcoming Google Meet meetings.",
    input_schema: { type: "object" as const, properties: { maxResults: { type: "number" } } },
  },
  {
    name: "create_meeting",
    description: "Create a Google Meet meeting.",
    input_schema: { type: "object" as const, properties: { title: { type: "string" }, startTime: { type: "string", description: "ISO datetime" }, endTime: { type: "string", description: "ISO datetime" }, attendeeEmails: { type: "array", items: { type: "string" } }, description: { type: "string" } }, required: ["title", "startTime", "endTime"] },
  },

  // ── Reports ────────────────────────────────────────────────────────────────
  {
    name: "get_expense_report",
    description: "Get an expense summary: total spend, breakdown by category, for an optional date range.",
    input_schema: { type: "object" as const, properties: { from: { type: "string" }, to: { type: "string" } } },
  },
  {
    name: "get_time_report",
    description: "Get a time-tracking summary: total hours logged, breakdown by project, for an optional date range.",
    input_schema: { type: "object" as const, properties: { from: { type: "string" }, to: { type: "string" }, projectId: { type: "string" } } },
  },

  // ── Automations ────────────────────────────────────────────────────────────
  {
    name: "search_automations",
    description: "List workflow automations and their status.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, isEnabled: { type: "boolean" }, limit: { type: "number" } } },
  },

  // ── Expense Categories & Recurring ────────────────────────────────────────
  {
    name: "search_expense_categories",
    description: "List all expense categories.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "search_recurring_expenses",
    description: "List recurring expense rules.",
    input_schema: { type: "object" as const, properties: { limit: { type: "number" } } },
  },
  {
    name: "create_expense",
    description: "Create an expense record.",
    input_schema: { type: "object" as const, properties: { date: { type: "string", description: "ISO date YYYY-MM-DD" }, amountCents: { type: "number" }, currency: { type: "string" }, vendor: { type: "string" }, description: { type: "string" }, categoryId: { type: "string" } }, required: ["date", "amountCents", "vendor"] },
  },

  // ── Contract Templates ─────────────────────────────────────────────────────
  {
    name: "search_contract_templates",
    description: "Search contract templates.",
    input_schema: { type: "object" as const, properties: { query: { type: "string" }, limit: { type: "number" } } },
  },

  // ── Roles ──────────────────────────────────────────────────────────────────
  {
    name: "search_roles",
    description: "List all staff roles and their permissions.",
    input_schema: { type: "object" as const, properties: {} },
  },

  // ── Site Settings ──────────────────────────────────────────────────────────
  {
    name: "get_site_settings",
    description: "Get the site/organisation settings (name, contact info, branding, etc.).",
    input_schema: { type: "object" as const, properties: {} },
  },

  // ── Announcements (write) ──────────────────────────────────────────────────
  {
    name: "create_announcement",
    description: "Create a team announcement.",
    input_schema: { type: "object" as const, properties: { title: { type: "string" }, body: { type: "string" }, authorName: { type: "string" } }, required: ["title", "body"] },
  },

  // ── Mutations ─────────────────────────────────────────────────────────────
  {
    name: "update_task",
    description: "Update a task — change title, priority, due date, assignee, or move to a different column.",
    input_schema: { type: "object" as const, properties: { taskId: { type: "string" }, title: { type: "string" }, description: { type: "string" }, priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }, columnId: { type: "string" }, dueDate: { type: "string" }, assignee: { type: "string" } }, required: ["taskId"] },
  },
  {
    name: "update_project",
    description: "Update a project — change name, status, or due date.",
    input_schema: { type: "object" as const, properties: { projectId: { type: "string" }, name: { type: "string" }, description: { type: "string" }, status: { type: "string", enum: ["active", "completed", "archived"] }, dueDate: { type: "string" } }, required: ["projectId"] },
  },
  {
    name: "update_contract",
    description: "Update a contract — change status, notes, or other fields.",
    input_schema: { type: "object" as const, properties: { contractId: { type: "string" }, status: { type: "string", enum: ["draft", "sent", "viewed", "signed", "declined", "expired"] }, notes: { type: "string" }, expiryDate: { type: "string" } }, required: ["contractId"] },
  }
);
