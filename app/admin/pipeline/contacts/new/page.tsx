import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import NewContactForm from "@/components/admin/pipeline/NewContactForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewContactPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">New Contact</h1>
        <p className="text-sm text-white/40 mt-1">Add a new lead or contact to the pipeline, and optionally create the Stripe customer at the same time.</p>
      </div>
      <NewContactForm />
    </div>
  );
}
