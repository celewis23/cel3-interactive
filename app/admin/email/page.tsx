export const dynamic = "force-dynamic";

import Link from "next/link";
import { getStoredTokens } from "@/lib/gmail/client";
import InboxClient from "@/components/admin/email/InboxClient";
import SignatureEditor from "@/components/admin/email/SignatureEditor";
import DisconnectButton from "./_components/DisconnectButton";

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const sp = await searchParams;
  const tokens = await getStoredTokens();
  const isConnected = !!(tokens?.access_token);

  if (!isConnected) {
    return (
      <div className="max-w-lg mx-auto py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="text-xs tracking-widest uppercase text-sky-400 mb-1">
            CEL3 Backoffice
          </div>
          <h1 className="text-2xl font-semibold text-white">Email</h1>
        </div>

        {/* Error notice */}
        {sp.error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/75 text-sm mb-6">
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            {sp.error === "access_denied"
              ? "Authorization was denied. Please try again."
              : sp.error === "token_exchange_failed"
              ? "Token exchange failed. Please try again."
              : decodeURIComponent(sp.error)}
          </div>
        )}

        {/* Connect card */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <svg
              width="28"
              height="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              className="text-sky-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-white mb-2">
            Connect your Gmail account
          </h2>
          <p className="text-white/50 text-sm mb-6 leading-relaxed">
            Connect Gmail to read, send, and manage your email directly from the
            backoffice. Your emails are never stored — they are fetched live from
            the Gmail API.
          </p>

          <ul className="space-y-2 mb-8">
            {[
              "Read and list inbox, sent, and draft messages",
              "Send and reply to emails on your behalf",
              "Mark messages as read",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-white/60">
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  className="text-sky-400 flex-shrink-0 mt-0.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/api/admin/email/auth/connect"
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              className="flex-shrink-0"
            >
              {/* Google "G" logo simplified */}
              <path
                fill="currentColor"
                d="M12 5c1.617 0 3.071.587 4.185 1.548l3.12-3.12C17.434 1.325 14.872.25 12 .25 7.314.25 3.317 3.07 1.426 7.097l3.636 2.821C6.048 7.138 8.833 5 12 5z"
              />
              <path
                fill="currentColor"
                opacity=".6"
                d="M23.49 12.275c0-.818-.073-1.608-.21-2.368H12v4.482h6.442c-.277 1.48-1.118 2.734-2.381 3.578l3.663 2.845C21.722 18.888 23.49 15.838 23.49 12.275z"
              />
            </svg>
            Connect Gmail
          </Link>
        </div>
      </div>
    );
  }

  // Connected state
  const email = tokens.email ?? "";

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Email</h1>
          {email && (
            <p className="text-sm text-white/40 mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
              {email}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/email/compose"
            className="bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <svg
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
              />
            </svg>
            Compose
          </Link>
          <DisconnectButton />
        </div>
      </div>

      {/* Connected success notice */}
      {sp.connected === "1" && (
        <div className="flex items-center gap-2 px-4 py-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-200 text-sm mb-6">
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Gmail connected successfully!
        </div>
      )}

      <InboxClient />

      <div className="mt-8">
        <SignatureEditor />
      </div>
    </div>
  );
}
