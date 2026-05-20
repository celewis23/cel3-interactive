export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import MessengerClient from "@/components/messaging/MessengerClient";

export default async function AdminMessagesPage({
  params,
}: {
  params: Promise<{ conversationId?: string[] }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const resolved = await params;
  return <MessengerClient mode="admin" initialConversationId={resolved.conversationId?.[0] ?? null} />;
}

