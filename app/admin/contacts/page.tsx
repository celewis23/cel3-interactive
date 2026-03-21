import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import ContactsClient from "@/components/admin/contacts/ContactsClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ContactsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  return <ContactsClient />;
}
