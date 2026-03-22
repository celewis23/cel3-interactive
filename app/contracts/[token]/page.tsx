import { notFound } from "next/navigation";
import ContractSigningClient from "@/components/contracts/ContractSigningClient";

export const dynamic = "force-dynamic";

async function getContract(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
  const res = await fetch(`${baseUrl}/api/contracts/${token}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function ContractSigningPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const contract = await getContract(token);
  if (!contract) notFound();

  return <ContractSigningClient contract={contract} token={token} />;
}
