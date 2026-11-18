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
      <div className="rounded-3xl border border-white/10 bg-[#101418] p-6 shadow-xl">
        <div className="flex items-center justify-between"><span className="text-xs font-semibold tracking-widest text-sky-400">METERWISE</span><span className="text-xs text-white/40">Widget preview · example data</span></div>
        <div className="mt-4 text-4xl font-semibold text-white">$78.37</div>
        <div className="mt-1 text-xs text-white/50">Month-to-date · Projected $138.30</div>
        <div className="my-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[['Connected providers', '7'], ['Active projects', '27'], ['Avg. daily spend', '$4.61'], ['Sync issues (recent)', '4']].map(([label, value]) => (
            <div key={label}><div className="text-xs text-white/45">{label}</div><div className={`mt-1 text-lg font-semibold ${label.startsWith('Sync') ? 'text-amber-400' : 'text-white'}`}>{value}</div></div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-4"><div className="text-xs uppercase tracking-wide text-white/45">Recent sync activity</div><p className="mt-2 text-sm text-white/75">Provider · Synced · 5m ago</p><p className="mt-1 text-sm text-amber-300">Provider · Partial · 12m ago</p></div>
        <p className="mt-4 text-xs text-white/35">Expand the widget to see provider costs and sync activity.</p>
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
      </div>
    </div>
  );
}
