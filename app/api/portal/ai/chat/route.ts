import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";
import { sanityServer } from "@/lib/sanityServer";
import { listInvoices } from "@/lib/stripe/billing";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type RequestMessage = {
  role: "user" | "assistant";
  content: string;
};

function normalizeMessages(input: unknown): RequestMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is RequestMessage => {
      if (!item || typeof item !== "object") return false;
      const role = (item as { role?: unknown }).role;
      const content = (item as { content?: unknown }).content;
      return (role === "user" || role === "assistant") && typeof content === "string";
    })
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4000),
    }))
    .filter((message) => message.content.length > 0);
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Portal assistant is not configured yet." }, { status: 503 });
  }

  try {
    const body = await req.json().catch(() => ({})) as { messages?: unknown };
    const messages = normalizeMessages(body.messages);
    if (messages.length === 0) {
      return NextResponse.json({ error: "A message is required." }, { status: 400 });
    }

    const user = await sanityServer.fetch<{
      _id: string;
      email: string;
      name: string | null;
      company: string | null;
      stripeCustomerId: string | null;
      pipelineContactId: string | null;
      driveRootFolderId: string | null;
      status: string | null;
    } | null>(
      `*[_type == "clientPortalUser" && _id == $id && status != "suspended"][0]{
        _id, email, name, company, stripeCustomerId, pipelineContactId, driveRootFolderId, status
      }`,
      { id: session.userId }
    );
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const refs = [user.stripeCustomerId, user.pipelineContactId].filter(Boolean) as string[];

    const [invoiceData, projects, tickets, estimates, contracts, onboarding, siteSettings] = await Promise.all([
      user.stripeCustomerId
        ? listInvoices({ customerId: user.stripeCustomerId, limit: 25 }).catch(() => ({ invoices: [] }))
        : Promise.resolve({ invoices: [] }),
      refs.length > 0
        ? sanityServer.fetch<Array<{
            _id: string;
            name: string;
            status: string;
            dueDate?: string | null;
            description?: string | null;
          }>>(
            `*[_type == "pmProject" && clientRef in $refs] | order(_createdAt desc) [0...10]{
              _id, name, status, dueDate, description
            }`,
            { refs }
          )
        : Promise.resolve([]),
      sanityServer.fetch<Array<{
        _id: string;
        title: string;
        status: string;
        priority: string;
        projectName?: string | null;
        updatedAt?: string | null;
        adminNotes?: string | null;
      }>>(
        `*[_type == "clientPortalTicket" && portalUserId == $userId] | order(updatedAt desc) [0...15]{
          _id, title, status, priority, projectName, updatedAt, adminNotes
        }`,
        { userId: user._id }
      ),
      sanityServer.fetch<Array<{
        _id: string;
        title: string;
        status: string;
        total: number;
      }>>(
        `*[_type == "estimate" && (
          (stripeCustomerId != null && stripeCustomerId == $stripeId) ||
          (pipelineContactId != null && pipelineContactId == $pipelineId) ||
          (clientEmail != null && clientEmail == $email)
        )] | order(_createdAt desc) [0...10]{
          _id, title, status, total
        }`,
        {
          stripeId: user.stripeCustomerId ?? "__none__",
          pipelineId: user.pipelineContactId ?? "__none__",
          email: user.email,
        }
      ),
      sanityServer.fetch<Array<{
        _id: string;
        title: string;
        status: string;
        clientName?: string | null;
      }>>(
        `*[_type == "contract" && (
          (portalUserId != null && portalUserId == $userId) ||
          (stripeCustomerId != null && stripeCustomerId == $stripeId) ||
          (clientEmail != null && clientEmail == $email)
        )] | order(_createdAt desc) [0...10]{
          _id, title, status, clientName
        }`,
        {
          userId: user._id,
          stripeId: user.stripeCustomerId ?? "__none__",
          email: user.email,
        }
      ),
      sanityServer.fetch<Array<{
        _id: string;
        title: string;
        status: string;
        actionType?: string | null;
      }>>(
        `*[_type == "onboardingStep" && (
          (portalUserId != null && portalUserId == $userId) ||
          (stripeCustomerId != null && stripeCustomerId == $stripeId) ||
          (pipelineContactId != null && pipelineContactId == $pipelineId)
        )] | order(order asc) [0...20]{
          _id, title, status, actionType
        }`,
        {
          userId: user._id,
          stripeId: user.stripeCustomerId ?? "__none__",
          pipelineId: user.pipelineContactId ?? "__none__",
        }
      ).catch(() => []),
      sanityServer.fetch<{
        businessName?: string | null;
        contactEmail?: string | null;
        phone?: string | null;
      } | null>(`*[_id == "siteSettings"][0]{ businessName, contactEmail, phone }`).catch(() => null),
    ]);

    const scopedContext = {
      portalUser: {
        name: user.name,
        company: user.company,
        email: user.email,
        driveFolderReady: Boolean(user.driveRootFolderId),
      },
      invoices: invoiceData.invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amountDue: invoice.amountDue,
        amountPaid: invoice.amountPaid,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        created: invoice.created,
        description: invoice.description,
      })),
      projects,
      tickets,
      estimates,
      contracts,
      onboarding,
      companyInfo: {
        businessName: siteSettings?.businessName ?? "CEL3 Interactive",
        contactEmail: siteSettings?.contactEmail ?? null,
        phone: siteSettings?.phone ?? null,
      },
    };

    const systemPrompt = `You are the client portal assistant for CEL3 Interactive.
You must answer ONLY from the account-scoped context provided to you plus the general company info provided to you.
Never reveal, infer, summarize, or hint at information about any other client, company, invoice, project, ticket, file, contract, estimate, or account.
If the answer is not present in the provided context, say that it is not available in this portal view.
Do not claim to have tools or live access beyond the provided context.
If asked for billing amounts, use the currency/amounts from the context as-is.
Keep responses concise, professional, and helpful.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      system: `${systemPrompt}\n\nScoped portal context:\n${JSON.stringify(scopedContext, null, 2)}`,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return NextResponse.json({ response: text || "I couldn't find that in your portal data." });
  } catch (err) {
    console.error("PORTAL_AI_CHAT_ERR:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Portal assistant failed" }, { status: 500 });
  }
}
