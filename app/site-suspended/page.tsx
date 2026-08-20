export const dynamic = "force-static";

export default function SiteSuspendedPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: "#0a0a0a",
      color: "#fff",
      fontFamily: "system-ui, -apple-system, sans-serif",
      textAlign: "center",
    }}>
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          Site Temporarily Unavailable
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
          This website is undergoing maintenance and will be back shortly. If you&apos;re the site owner,
          please contact us to resolve this.
        </p>
      </div>
    </div>
  );
}
