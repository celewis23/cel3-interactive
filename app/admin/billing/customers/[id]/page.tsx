import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect, notFound } from "next/navigation";
import { getCustomer } from "@/lib/stripe/billing";
import { getCustomerDriveLinks } from "@/lib/stripe/customerDriveLinks";
import CustomerDetailClient from "@/components/admin/billing/CustomerDetailClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const { id } = await params;
  const [customer, driveLinks] = await Promise.all([
    getCustomer(id),
    getCustomerDriveLinks(id).catch(() => []),
  ]);

  if (!customer) notFound();

  return <CustomerDetailClient customer={customer} initialLinks={driveLinks} />;
}
