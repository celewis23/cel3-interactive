export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import ChatClient from "@/components/admin/chat/ChatClient";

export default async function ChatPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");
  return <ChatClient />;
}
