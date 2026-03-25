export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import type { AutomationNode, AutomationSuggestion } from "@/lib/automations/types";
import { TRIGGER_LABELS, ACTION_LABELS, summariseNode, generateNodeId } from "@/lib/automations/types";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "automations", "view");
  if (authErr) return authErr;

  // Gracefully degrade if no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const body = await req.json() as {
      current_nodes: AutomationNode[];
      insertion_point: string;
      branch: "main" | "yes" | "no";
      org_context: { industry: string; active_modules: string[]; integrations: string[] };
      trigger_type: string;
    };

    const { current_nodes, insertion_point, branch, org_context, trigger_type } = body;

    const nodeSummary = current_nodes
      .filter((n) => n.type !== "trigger")
      .map((n) => summariseNode(n))
      .join(" → ");

    const lastNode = current_nodes.find((n) => n.id === insertion_point);
    const lastNodeLabel = lastNode ? summariseNode(lastNode) : "start";

    const prompt = `You are an automation expert for a business management platform called CEL3 Interactive.
Given the current workflow state, suggest 3 practical next automation steps.
Return ONLY a JSON array of suggestions. No preamble, no markdown fences.

Current workflow trigger: ${TRIGGER_LABELS[trigger_type as keyof typeof TRIGGER_LABELS] ?? trigger_type}
Current steps so far: ${nodeSummary || "(none yet)"}
Insertion point: after "${lastNodeLabel}" on the ${branch} branch
Business context: ${JSON.stringify(org_context)}

Each suggestion must be:
1. Genuinely useful for this specific workflow context
2. A single automation node (not a multi-step sequence)
3. Ready to use with pre-filled config

Available action types: ${Object.entries(ACTION_LABELS).map(([k, v]) => `${k} (${v})`).join(", ")}

Return exactly this format (no other text):
[{"label":"...", "description":"...", "node":{"type":"action","config":{"action_type":"...","action_config":{...},"require_approval":false,"on_error":"skip"}}}]

Make sure action_config fields match these shapes:
- send_email: { to, subject, body_html }
- create_task: { title, priority, due_days_from_now }
- add_client_tag: { tag }
- send_internal_notification: { user_ids: "all_admins", message }
- move_lead_stage: { stage }
- change_project_status: { status }`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "[]";

    // Parse the JSON — extract array even if there's extra text
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ suggestions: [] });

    const raw = JSON.parse(jsonMatch[0]) as Array<{
      label: string;
      description: string;
      node: Omit<AutomationNode, "id" | "position">;
    }>;

    const suggestions: AutomationSuggestion[] = raw.slice(0, 3).map((s) => ({
      label: s.label,
      description: s.description,
      node: s.node,
    }));

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("SUGGEST_ERR:", err);
    // Graceful degrade — return empty rather than 500
    return NextResponse.json({ suggestions: [] });
  }
}
