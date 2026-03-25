export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_projects",
    description: "Search and list projects. Can filter by status, name, or get a specific project by ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search term for project name" },
        status: { type: "string", enum: ["active", "completed", "archived"], description: "Filter by status" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
    },
  },
  {
    name: "search_tasks",
    description: "Search tasks/kanban cards across all projects. Can filter by assignee, priority, or search by title.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search term" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        limit: { type: "number", description: "Max results (default 10)" },
      },
    },
  },
  {
    name: "search_contacts",
    description: "Search CRM contacts and leads by name, email, or company.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search term" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "search_invoices",
    description: "Search invoices. Can filter by status (draft, open, paid, void) or client.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string" },
        query: { type: "string", description: "Search by invoice number or client name" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "search_expenses",
    description: "Search expense records, optionally filtered by date range or category.",
    input_schema: {
      type: "object" as const,
      properties: {
        from: { type: "string", description: "ISO date start" },
        to:   { type: "string", description: "ISO date end" },
        query: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "search_contracts",
    description: "Search contracts by client name, status, or title.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
        status: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "search_estimates",
    description: "Search estimates/quotes by client name or status.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
        status: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "search_staff",
    description: "List or search staff members and their roles.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
      },
    },
  },
  {
    name: "search_assets",
    description: "Search the asset library for files, images, documents.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
        fileType: { type: "string", enum: ["image", "video", "pdf", "doc", "spreadsheet", "font", "zip"] },
        tag: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "search_time_entries",
    description: "Search time tracking entries. Can filter by date range or project.",
    input_schema: {
      type: "object" as const,
      properties: {
        from: { type: "string" },
        to:   { type: "string" },
        projectId: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "search_announcements",
    description: "Search team announcements.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "search_forms",
    description: "List forms and their recent submissions.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_dashboard_summary",
    description: "Get a summary of key metrics: active projects count, open invoices, recent activity.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "create_task",
    description: "Create a new task/card in a project column.",
    input_schema: {
      type: "object" as const,
      properties: {
        title:       { type: "string", description: "Task title" },
        description: { type: "string" },
        priority:    { type: "string", enum: ["low", "medium", "high", "urgent"] },
        columnId:    { type: "string", description: "Kanban column ID to add the task to" },
      },
      required: ["title", "columnId"],
    },
  },
  {
    name: "create_contact",
    description: "Create a new CRM contact/lead.",
    input_schema: {
      type: "object" as const,
      properties: {
        name:    { type: "string" },
        email:   { type: "string" },
        phone:   { type: "string" },
        company: { type: "string" },
        notes:   { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "search_audit_log",
    description: "Search the audit log for recent actions, filtered by action type or user.",
    input_schema: {
      type: "object" as const,
      properties: {
        action: { type: "string", description: "Action type filter (e.g. 'contract.sent')" },
        limit:  { type: "number" },
      },
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  const limit = (input.limit as number) ?? 10;
  const query = (input.query as string) ?? "";

  switch (name) {
    case "search_projects": {
      const filters = [`_type == "pmProject"`];
      if (input.status) filters.push(`status == "${input.status}"`);
      if (query) filters.push(`name match "*${query}*"`);
      return await sanityServer.fetch(
        `*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, name, status, description, dueDate, _createdAt }`
      );
    }
    case "search_tasks": {
      const filters = [`_type == "pmTask"`];
      if (input.priority) filters.push(`priority == "${input.priority}"`);
      if (query) filters.push(`title match "*${query}*"`);
      return await sanityServer.fetch(
        `*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, title, description, priority, assignee, dueDate, _createdAt }`
      );
    }
    case "search_contacts": {
      const filters = [`_type == "contact"`];
      if (query) filters.push(`(name match "*${query}*" || email match "*${query}*" || company match "*${query}*")`);
      return await sanityServer.fetch(
        `*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, name, email, phone, company, stage, _createdAt }`
      );
    }
    case "search_invoices": {
      const filters = [`_type == "invoice"`];
      if (input.status) filters.push(`status == "${input.status}"`);
      if (query) filters.push(`(number match "*${query}*" || clientName match "*${query}*")`);
      return await sanityServer.fetch(
        `*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, number, status, amountCents, currency, clientName, dueDate, _createdAt }`
      );
    }
    case "search_expenses": {
      const filters = [`_type == "expense"`];
      if (input.from) filters.push(`date >= "${input.from}"`);
      if (input.to)   filters.push(`date <= "${input.to}"`);
      if (query) filters.push(`(vendor match "*${query}*" || description match "*${query}*")`);
      return await sanityServer.fetch(
        `*[${filters.join(" && ")}] | order(date desc) [0...${limit}] { _id, date, amountCents, currency, vendor, description, categoryId, _createdAt }`
      );
    }
    case "search_contracts": {
      const filters = [`_type == "contract"`];
      if (input.status) filters.push(`status == "${input.status}"`);
      if (query) filters.push(`(title match "*${query}*" || clientName match "*${query}*")`);
      return await sanityServer.fetch(
        `*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, title, status, clientName, value, signedAt, _createdAt }`
      );
    }
    case "search_estimates": {
      const filters = [`_type == "estimate"`];
      if (input.status) filters.push(`status == "${input.status}"`);
      if (query) filters.push(`(title match "*${query}*" || clientName match "*${query}*")`);
      return await sanityServer.fetch(
        `*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, title, status, clientName, totalCents, _createdAt }`
      );
    }
    case "search_staff": {
      const filters = [`_type == "staffMember"`];
      if (query) filters.push(`(name match "*${query}*" || email match "*${query}*")`);
      return await sanityServer.fetch(
        `*[${filters.join(" && ")}] | order(name asc) [0...${limit}] { _id, name, email, roleSlug, isActive, _createdAt }`
      );
    }
    case "search_assets": {
      const filters = [`_type == "assetItem"`];
      if (input.fileType) filters.push(`fileType == "${input.fileType}"`);
      if (input.tag)      filters.push(`"${input.tag}" in tags`);
      if (query)          filters.push(`name match "*${query}*"`);
      return await sanityServer.fetch(
        `*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, name, fileUrl, fileType, mimeType, sizeBytes, tags, _createdAt }`
      );
    }
    case "search_time_entries": {
      const filters = [`_type == "timeEntry"`];
      if (input.from)      filters.push(`date >= "${input.from}"`);
      if (input.to)        filters.push(`date <= "${input.to}"`);
      if (input.projectId) filters.push(`projectId == "${input.projectId}"`);
      return await sanityServer.fetch(
        `*[${filters.join(" && ")}] | order(date desc) [0...${limit}] { _id, date, durationMinutes, description, projectId, staffId, _createdAt }`
      );
    }
    case "search_announcements": {
      const filters = [`_type == "announcement"`];
      if (query) filters.push(`(title match "*${query}*" || body match "*${query}*")`);
      return await sanityServer.fetch(
        `*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, title, body, authorName, _createdAt }`
      );
    }
    case "search_forms": {
      const filters = [`_type == "cel3Form"`];
      if (query) filters.push(`name match "*${query}*"`);
      const forms = await sanityServer.fetch(
        `*[${filters.join(" && ")}] | order(_createdAt desc) [0...${limit}] { _id, name, fields, _createdAt }`
      );
      return forms;
    }
    case "get_dashboard_summary": {
      const [projects, openInvoices, recentAudit, contacts] = await Promise.all([
        sanityServer.fetch<number>(`count(*[_type == "pmProject" && status == "active"])`),
        sanityServer.fetch<number>(`count(*[_type == "invoice" && status == "open"])`),
        sanityServer.fetch(
          `*[_type == "auditEvent"] | order(timestamp desc) [0...5] { action, userName, description, timestamp }`
        ),
        sanityServer.fetch<number>(`count(*[_type == "contact"])`),
      ]);
      return { activeProjects: projects, openInvoices, totalContacts: contacts, recentActivity: recentAudit };
    }
    case "create_task": {
      const task = await sanityWriteClient.create({
        _type: "pmTask",
        title: input.title as string,
        description: (input.description as string) ?? "",
        priority: (input.priority as string) ?? "medium",
        createdAt: new Date().toISOString(),
      });
      // Append to column if columnId provided
      if (input.columnId) {
        await sanityWriteClient
          .patch(input.columnId as string)
          .setIfMissing({ taskIds: [] })
          .append("taskIds", [task._id])
          .commit();
      }
      return task;
    }
    case "create_contact": {
      const contact = await sanityWriteClient.create({
        _type: "contact",
        name:    input.name as string,
        email:   (input.email as string)   ?? null,
        phone:   (input.phone as string)   ?? null,
        company: (input.company as string) ?? null,
        notes:   (input.notes as string)   ?? null,
        createdAt: new Date().toISOString(),
      });
      return contact;
    }
    case "search_audit_log": {
      const filters = [`_type == "auditEvent"`];
      if (input.action) filters.push(`action == "${input.action}"`);
      return await sanityServer.fetch(
        `*[${filters.join(" && ")}] | order(timestamp desc) [0...${limit}] { _id, action, userName, description, resourceType, resourceLabel, timestamp }`
      );
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "aiAssistant", "view");
  if (authErr) return authErr;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured. Add it to your .env.local file." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json() as { messages: Anthropic.MessageParam[] };
    const messages: Anthropic.MessageParam[] = body.messages ?? [];

    if (!messages.length) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    // Agentic loop — run until no more tool calls
    let response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: `You are a helpful AI assistant embedded in the CEL3 Interactive backoffice.
You have access to all data in the system via tools: projects, tasks, contacts, invoices, expenses,
contracts, estimates, staff, assets, time entries, announcements, forms, and the audit log.
You can also create tasks and contacts.

When answering questions about data, always use the appropriate tool to fetch real, up-to-date information.
Be concise and helpful. Format responses clearly using markdown when appropriate.
Today's date is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
      messages,
      tools: TOOLS,
    });

    // Handle tool use loop
    const loopMessages: Anthropic.MessageParam[] = [...messages];
    let iterations = 0;

    while (response.stop_reason === "tool_use" && iterations < 10) {
      iterations++;
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      // Execute all tools in parallel
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          try {
            const result = await executeTool(block.name, block.input as Record<string, unknown>);
            return {
              type: "tool_result" as const,
              tool_use_id: block.id,
              content: JSON.stringify(result, null, 2),
            };
          } catch (err) {
            return {
              type: "tool_result" as const,
              tool_use_id: block.id,
              content: `Error: ${err instanceof Error ? err.message : String(err)}`,
              is_error: true,
            };
          }
        })
      );

      loopMessages.push(
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults }
      );

      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: `You are a helpful AI assistant embedded in the CEL3 Interactive backoffice.
You have access to all data in the system via tools: projects, tasks, contacts, invoices, expenses,
contracts, estimates, staff, assets, time entries, announcements, forms, and the audit log.
You can also create tasks and contacts.

When answering questions about data, always use the appropriate tool to fetch real, up-to-date information.
Be concise and helpful. Format responses clearly using markdown when appropriate.
Today's date is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
        messages: loopMessages,
        tools: TOOLS,
      });
    }

    // Extract final text response
    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    const text = textBlock?.text ?? "Done.";

    return NextResponse.json({ response: text });
  } catch (err) {
    console.error("AI_CHAT_ERR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI request failed" },
      { status: 500 }
    );
  }
}
