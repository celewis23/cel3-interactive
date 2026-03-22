import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { createCustomer } from "@/lib/stripe/billing";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;

    const contact = await sanityServer.fetch<{
      _id: string;
      name: string;
      email: string | null;
      phone: string | null;
      company: string | null;
    } | null>(
      `*[_type == "pipelineContact" && _id == $id][0]{ _id, name, email, phone, company }`,
      { id }
    );
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const customer = await createCustomer({
      name: contact.name,
      email: contact.email ?? undefined,
      phone: contact.phone ?? undefined,
      description: contact.company ?? undefined,
    });

    // Patch contact with stripeCustomerId
    await sanityWriteClient.patch(id).set({ stripeCustomerId: customer.id }).commit();

    // Create "converted" activity
    await sanityWriteClient.create({
      _type: "pipelineActivity",
      contactId: id,
      type: "converted",
      text: `Converted to Stripe customer (${customer.id})`,
      fromStage: null,
      toStage: null,
      author: "Admin",
    });

    return NextResponse.json({ stripeCustomerId: customer.id, customer });
  } catch (err) {
    console.error("PIPELINE_CONVERT_ERR:", err);
    return NextResponse.json({ error: "Failed to convert contact" }, { status: 500 });
  }
}
