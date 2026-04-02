export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySessionToken } from "@/lib/admin/auth";
import TasksClient from "@/components/admin/tasks/TasksClient";

export default async function TasksPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  return <TasksClient />;
}
