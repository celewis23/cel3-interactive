export const dynamic = "force-dynamic";

import Link from "next/link";
import ComposeClient from "@/components/admin/email/ComposeClient";

interface Props {
  searchParams: Promise<{ to?: string }>;
}

export default async function ComposePage({ searchParams }: Props) {
  const sp = await searchParams;
  const initialTo = sp.to ? decodeURIComponent(sp.to) : "";

  return (
    <div>
      {/* Back link */}
      <Link
        href="/admin/email"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-sky-200"
      >
        <svg
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        Inbox
      </Link>

      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">New Email</h1>
        <p className="mt-0.5 text-sm text-white/40">Compose and send a new email.</p>
      </div>

      <ComposeClient initialTo={initialTo} />
    </div>
  );
}
