import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "onboarding", "view");
  if (authErr) return authErr;
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const filter = status ? ` && status == "${status}"` : "";
    const instances = await sanityServer.fetch(
      `*[_type == "onboardingInstance"${filter}] | order(_createdAt desc) {
        _id, templateName, clientName, clientEmail, clientCompany,
        pipelineContactId, stripeCustomerId, portalUserId,
        startDate, status, steps, _createdAt
      }`
    );
    return NextResponse.json(instances);
  } catch (err) {
    console.error("ONBOARDING_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch onboarding instances" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "onboarding", "edit");
  if (authErr) return authErr;
  try {
    const body = await req.json();
    if (!body.clientName?.trim()) {
      return NextResponse.json({ error: "clientName is required" }, { status: 400 });
    }

    const startDate = body.startDate || new Date().toISOString().slice(0, 10);

    // Load template steps if a template was selected
    let steps: Array<{
      _key: string;
      order: number;
      title: string;
      description: string | null;
      dueDate: string | null;
      actionType: string;
      status: string;
      completedAt: string | null;
      notes: string | null;
    }> = [];

    if (body.templateId) {
      const template = await sanityServer.fetch<{
        _id: string;
        name: string;
        steps: Array<{
          _key: string;
          order: number;
          title: string;
          description: string | null;
          dueDateOffsetDays: number | null;
          actionType: string;
        }>;
      }>(`*[_type == "onboardingTemplate" && _id == $id][0]{ _id, name, steps }`, {
        id: body.templateId,
      });

      if (template?.steps) {
        steps = template.steps.map((s) => ({
          _key: crypto.randomUUID(),
          order: s.order,
          title: s.title,
          description: s.description ?? null,
          dueDate:
            s.dueDateOffsetDays != null
              ? addDays(startDate, s.dueDateOffsetDays)
              : null,
          actionType: s.actionType || "manual",
          status: "pending",
          completedAt: null,
          notes: null,
        }));
      }
    }

    const instance = await sanityWriteClient.create({
      _type: "onboardingInstance",
      templateId: body.templateId || null,
      templateName: body.templateName || null,
      clientName: body.clientName.trim(),
      clientEmail: body.clientEmail?.trim() || null,
      clientCompany: body.clientCompany?.trim() || null,
      pipelineContactId: body.pipelineContactId || null,
      stripeCustomerId: body.stripeCustomerId || null,
      portalUserId: body.portalUserId || null,
      startDate,
      status: "active",
      steps,
      notes: body.notes?.trim() || null,
    });

    return NextResponse.json(instance, { status: 201 });
  } catch (err) {
    console.error("ONBOARDING_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create onboarding instance" }, { status: 500 });
  }
}
