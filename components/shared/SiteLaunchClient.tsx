"use client";

import { useEffect, useRef } from "react";

type Props = {
  title: string;
  siteUrl: string | null;
  managementUrl: string | null;
  loginAction: string | null;
  username: string | null;
  password: string | null;
  isWordPress: boolean;
  homeHref: string;
};

export default function SiteLaunchClient({
  title,
  siteUrl,
  managementUrl,
  loginAction,
  username,
  password,
  isWordPress,
  homeHref,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const shouldAutoSubmit = Boolean(isWordPress && loginAction && username && password && managementUrl);

  useEffect(() => {
    if (!shouldAutoSubmit) return;
    const timer = window.setTimeout(() => formRef.current?.submit(), 150);
    return () => window.clearTimeout(timer);
  }, [shouldAutoSubmit]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-400">Manage Site</p>
        <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-white/55">
          {shouldAutoSubmit
            ? "Launching the saved management login now."
            : "This site can be opened, but automatic login is only available for supported management URLs such as WordPress login screens."}
        </p>

        <div className="mt-6 space-y-3 rounded-2xl border border-white/8 bg-black/20 p-4">
          {siteUrl && (
            <div>
              <p className="text-xs text-white/35 mb-1">Website</p>
              <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-400 hover:text-sky-300 break-all">
                {siteUrl}
              </a>
            </div>
          )}
          {managementUrl && (
            <div>
              <p className="text-xs text-white/35 mb-1">Management URL</p>
              <a href={managementUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-400 hover:text-sky-300 break-all">
                {managementUrl}
              </a>
            </div>
          )}
          {username && (
            <div>
              <p className="text-xs text-white/35 mb-1">Saved username</p>
              <p className="text-sm text-white/75">{username}</p>
            </div>
          )}
        </div>

        {shouldAutoSubmit && loginAction && managementUrl && (
          <form ref={formRef} action={loginAction} method="post" className="hidden">
            <input type="hidden" name="log" value={username ?? ""} />
            <input type="hidden" name="pwd" value={password ?? ""} />
            <input type="hidden" name="rememberme" value="forever" />
            <input type="hidden" name="redirect_to" value={managementUrl} />
            <input type="hidden" name="testcookie" value="1" />
            <input type="hidden" name="wp-submit" value="Log In" />
          </form>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {managementUrl && (
            <a
              href={managementUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-400 transition-colors"
            >
              Open Management URL
            </a>
          )}
          {siteUrl && (
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
            >
              Open Website
            </a>
          )}
          <a
            href={homeHref}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            Go back
          </a>
        </div>
      </div>
    </div>
  );
}
