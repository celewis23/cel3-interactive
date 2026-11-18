import { access, readFile } from "fs/promises";
import path from "path";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AndroidConsolePage() {
  const available = await access(path.join(process.cwd(), "public/downloads/meterwise.apk")).then(() => true, () => false);
  const release = await readFile(path.join(process.cwd(), "public/downloads/meterwise-release.json"), "utf8").then(text => JSON.parse(text) as { versionName: string }, () => null);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-12">
      <Link href="/admin" className="text-sm text-sky-300">← Backoffice</Link>
      <div className="rounded-3xl border border-teal-200/20 bg-linear-to-br from-[#10172c] to-[#254556] p-7">
        <p className="text-xs uppercase tracking-widest text-teal-200">CEL3 Backoffice for Android</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Your console. Its own app window.</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">Open the full backoffice directly from your phone’s app icon, without Chrome’s address bar or browser menu. Meterwise and your home-screen widget are included.</p>
        {available ? <a href="/api/admin/android-download" className="mt-6 inline-flex rounded-xl bg-teal-200 px-5 py-3 text-sm font-semibold text-[#10172c]">Download console APK{release?.versionName ? ` · ${release.versionName}` : ""}</a> : <p className="mt-6 text-sm text-orange-200">The Android console download will appear here after the app package is published.</p>}
      </div>
      <div className="rounded-2xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white">Install from your phone</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-white/65">
          <li>Tap <strong className="text-white">Download console APK</strong>, then open the downloaded <strong className="text-white">cel3-backoffice.apk</strong>.</li>
          <li>If Android asks, allow your browser to install this app, then confirm installation. If you already installed Meterwise, choose <strong className="text-white">Update</strong>; this is the same package and keeps your widget.</li>
          <li>Open <strong className="text-white">CEL3 Backoffice</strong> from your phone’s app drawer. Sign in with your backoffice credentials and complete your PIN if prompted.</li>
          <li>Your widget connects automatically after console sign-in when your account has Meterwise access. Tap <strong className="text-white">Widget</strong> in the app to add or manage it.</li>
        </ol>
        <p className="mt-5 text-xs leading-5 text-white/45">Requires Android 8.0 or newer. The APK has its own sign-in storage, separate from Chrome; sign in once inside the new app. Backoffice pages stay in the app, while external websites may open in your browser.</p>
        <p className="mt-3 text-xs leading-5 text-white/45">Use the app’s Update button or the widget’s Update control for future releases. Your Chrome PWA can remain installed, but open CEL3 Backoffice’s Android app icon for the native window.</p>
      </div>
      <Link href="/admin/meterwise/android" className="text-sm text-teal-200">Meterwise widget details →</Link>
    </div>
  );
}
