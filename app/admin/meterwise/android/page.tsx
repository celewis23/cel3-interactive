import Link from "next/link";
import { access } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export default async function MeterwiseAndroidPage() {
  const available = await access(path.join(process.cwd(), "public/downloads/meterwise.apk")).then(() => true, () => false);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-12">
      <Link href="/admin/meterwise" className="text-sm text-sky-300 hover:text-sky-200">← Meterwise dashboard</Link>
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-sky-400">Meterwise for Android</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Your spending, on your home screen.</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">Keep spending and sync activity in view with a resizable Android widget. Your app and widget share one sign-in. If you’re already signed into backoffice in your phone browser, connect without entering your credentials again.</p>
      </div>
      <div className="relative isolate overflow-hidden rounded-3xl border border-teal-200/20 bg-linear-to-r from-[#10172c] via-[#192542] to-[#254556] p-5 shadow-xl sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 -z-10 size-80 rounded-full border border-teal-200/20 bg-teal-300/5 p-10"><div className="size-full rounded-full border border-teal-200/20 p-8"><div className="size-full rounded-full border border-orange-200/25" /></div></div>
        <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold tracking-[0.15em] text-teal-200">METERWISE / MONTH</span><span className="flex gap-2 text-[10px]"><span className="rounded-lg bg-teal-300/10 px-2 py-1 text-teal-100">Refresh</span><span className="rounded-lg bg-teal-300/10 px-2 py-1 text-orange-200">Update</span></span></div>
        <div className="my-3 flex items-center justify-between"><div className="font-serif text-5xl text-white">$78.37</div><div className="text-right text-xs leading-5 text-slate-300">Projected<br />$138.30</div></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[['Connected providers', '7'], ['Active projects', '27'], ['Avg. daily spend', '$4.61'], ['Sync issues (recent)', '4']].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-teal-300/10 bg-[#10172c]/50 px-3 py-2"><div className="text-[10px] text-slate-400">{label}</div><div className={`mt-1 text-lg font-medium ${label.startsWith('Sync') ? 'text-orange-200' : 'text-white'}`}>{value}</div></div>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[10px]"><span className="text-slate-400">Updated just now · Example data</span><span className="text-teal-200">Backoffice ↗</span></div>
        <p className="mt-4 text-xs text-slate-400">4×2 preview. Expand the widget to see provider costs and sync activity.</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <h2 className="text-lg font-semibold text-white">Install on your Android phone</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-white/65">
          <li>Open this page on your phone and download the Meterwise app below. Requires Android 8.0 or newer.</li>
          <li>Open the downloaded APK. If Android asks, allow your browser to install this app, then confirm installation.</li>
          <li>Open Meterwise and tap <strong className="text-white">Connect to backoffice</strong>. Your phone browser uses your current sign-in automatically. If needed, sign in and complete your PIN, then return to the app.</li>
          <li>Tap <strong className="text-white">Add home-screen widget</strong>. You can also long-press your home screen and choose <strong className="text-white">Widgets → Meterwise</strong>.</li>
          <li>Drag the widget edges to resize it down to 4×2. A taller widget shows provider costs and recent sync activity.</li>
        </ol>
        {available ? (
          <a href="/api/admin/meterwise/android-download" className="mt-6 inline-block rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-black hover:bg-sky-300">Download Android app (.apk)</a>
        ) : <p className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">The Android download will appear here when the app package is published.</p>}
        <p className="mt-4 text-xs leading-5 text-white/40">Updates run about every 30 minutes when Android allows, with a manual refresh button for the latest figures. If you are offline, the widget keeps the last saved information and shows its age. Logging out in the app clears this device; changing your password disconnects it on its next check.</p>
        <p className="mt-2 text-xs leading-5 text-white/40">There is no separate widget login. The app and all its widgets share this device connection.</p>
        <p className="mt-3 text-sm leading-6 text-white/65"><strong className="text-teal-200">Refresh</strong> updates figures directly on the widget. <strong className="text-orange-200">Update</strong> checks for new widget software, downloads it, and opens Android’s installation confirmation. Install this release once to get that control; future releases can be installed from the widget.</p>
        <p className="mt-3 text-sm leading-6 text-white/65">Tap the widget to open Meterwise in your installed backoffice web app. If Android opens a browser instead, open <Link href="/admin" className="text-teal-200 underline">Backoffice</Link> in Chrome and use <strong className="text-white">Install app</strong> with the updated backoffice manifest. A home-screen bookmark does not register an Android app link handler.</p>
      </div>
    </div>
  );
}
