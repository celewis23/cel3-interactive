import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import EstimatePrintClient from "@/components/admin/estimates/EstimatePrintClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export default async function EstimatePrintPage({ params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const { id } = await params;
  const estimate = await sanityServer.fetch(
    `*[_type == "estimate" && _id == $id][0]`,
    { id }
  );

  if (!estimate) redirect("/admin/estimates");

  return <EstimatePrintClient estimate={estimate} />;
}
