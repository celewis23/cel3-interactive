import { downloadPackage } from "@/lib/client-downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A private file read uses POST to keep access codes out of URLs and access logs.
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  return downloadPackage(request, slug);
}
