export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { getThread } from "@/lib/gmail/api";
import { sanityServer } from "@/lib/sanityServer";
import ThreadClient from "@/components/admin/email/ThreadClient";
import type { GmailThreadLink } from "@/lib/gmail/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ThreadPage({ params }: Props) {
  const { id } = await params;

  // Auth check
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") {
    redirect("/admin/login");
  }

  // Fetch thread and link in parallel
  let thread;
  let link: GmailThreadLink | null = null;

  try {
    [thread, link] = await Promise.all([
      getThread(id),
      sanityServer
        .fetch<GmailThreadLink | null>(
          `*[_type == "gmailThreadLink" && gmailThreadId == $id][0]`,
          { id }
        )
        .catch(() => null),
    ]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load thread";
    return (
      <div>
        <Link
          href="/admin/email"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mb-6"
        >
          <svg
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Inbox
        </Link>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-6 py-8 text-center">
          <p className="text-red-400 font-medium mb-1">Failed to load thread</p>
          <p className="text-white/40 text-sm">{message}</p>
        </div>
      </div>
    );
  }

  const firstMessage = thread.messages[0];
  const subject = firstMessage?.headers.subject ?? "(no subject)";

  return (
    <div>
      {/* Back link */}
      <Link
        href="/admin/email"
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mb-6"
      >
        <svg
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        Inbox
      </Link>

      {/* Thread header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white leading-snug">{subject}</h1>
        <p className="text-sm text-white/40 mt-1">
          {thread.messages.length} message{thread.messages.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Thread client */}
      <ThreadClient thread={thread} link={link} />
    </div>
  );
}
