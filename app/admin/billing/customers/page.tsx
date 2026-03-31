import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { listCustomers } from "@/lib/stripe/billing";
import { sanityServer } from "@/lib/sanityServer";
import CreateCustomerForm from "./CreateCustomerForm";
import CustomersTable from "./CustomersTable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CustomersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const [{ customers, hasMore }, importedContacts, portalUsers] = await Promise.all([
    listCustomers({ limit: 50 }),
    sanityServer.fetch<Array<{ _id: string; name: string; stripeCustomerId: string | null; googleContactResourceName: string | null }>>(
      `*[_type == "pipelineContact" && stripeCustomerId != null]{
        _id, name, stripeCustomerId, googleContactResourceName
      }`
    ),
    sanityServer.fetch<Array<{ _id: string; email: string; stripeCustomerId: string | null; status: string; driveRootFolderId: string | null }>>(
      `*[_type == "clientPortalUser" && stripeCustomerId != null]{
        _id, email, stripeCustomerId, status, driveRootFolderId
      }`
    ),
  ]);

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Customers</h1>
          <p className="text-sm text-white/40 mt-1">
            {customers.length} customer{customers.length !== 1 ? "s" : ""}
            {hasMore ? "+" : ""}
          </p>
        </div>
        <CreateCustomerForm />
      </div>

      <CustomersTable customers={customers} hasMore={hasMore} importedContacts={importedContacts} portalUsers={portalUsers} />
    </div>
  );
}
