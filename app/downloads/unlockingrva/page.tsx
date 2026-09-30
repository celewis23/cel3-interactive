import type { Metadata } from "next";
import Link from "next/link";
import DownloadForm from "./DownloadForm";
import styles from "./download.module.css";

export const metadata: Metadata = {
  title: "UnlockingRVA · Website handoff",
  description: "Your Option C website package from CEL3 Interactive.",
  robots: { index: false, follow: false, nocache: true },
};

export default function UnlockingRvaDownload() {
  return <main className={styles.page}>
    <div className={styles.shell}>
      <Link className={styles.brand} href="/">CEL3 INTERACTIVE <span>CLIENT DELIVERY</span></Link>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Prepared for UnlockingRVA</p>
        <h1>Your next chapter,<br /><em>ready to unpack.</em></h1>
        <p className={styles.intro}>Option C · The Almanac<br />Your complete front-end website handoff.</p>
        <ul><li>Editable HTML, CSS and JavaScript</li><li>WordPress theme and local font files</li><li>Installation guide for hosting, WordPress and Wix embedding</li></ul>
        <DownloadForm />
        <p className={styles.note}>After downloading, extract the ZIP and open START-HERE.html or Installation-Guide.pdf. Wix displays this design through an embed; it does not import it into the Wix editor.</p>
      </section>
      <footer className={styles.footer}>Made for your next good thing.<br /><a href="mailto:info@cel3interactive.com">Need help? Contact CEL3 Interactive</a></footer>
    </div>
  </main>;
}
