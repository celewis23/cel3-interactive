import type { Newsletter } from "@/lib/newsletters/db";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cel3interactive.com";

export function escHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizeVideoUrl(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : trimmed;
    }
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : trimmed;
    }
    if (url.hostname.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : trimmed;
    }
    return trimmed;
  } catch {
    return null;
  }
}

export function buildPortalNewsletterStyle(newsletter: Pick<Newsletter, "backgroundColor" | "backgroundImageUrl" | "fontFamily" | "textColor">) {
  return {
    backgroundColor: newsletter.backgroundColor,
    backgroundImage: newsletter.backgroundImageUrl ? `url(${newsletter.backgroundImageUrl})` : undefined,
    backgroundSize: newsletter.backgroundImageUrl ? "cover" : undefined,
    backgroundPosition: newsletter.backgroundImageUrl ? "center" : undefined,
    color: newsletter.textColor,
    fontFamily: newsletter.fontFamily,
  };
}

export function buildNewsletterEmailHtml(newsletter: Newsletter): string {
  const portalUrl = `${BASE_URL}/portal/newsletters/${newsletter.id}`;
  const videoUrl = normalizeVideoUrl(newsletter.videoUrl);
  const background = newsletter.backgroundImageUrl
    ? `background:${newsletter.backgroundColor} url('${newsletter.backgroundImageUrl}') center/cover no-repeat;`
    : `background:${newsletter.backgroundColor};`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escHtml(newsletter.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:${escHtml(newsletter.fontFamily)};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 12px;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="${background}border-radius:16px;overflow:hidden;border:1px solid rgba(17,24,39,.08);">
        <tr>
          <td style="padding:28px 32px;background:${escHtml(newsletter.accentColor)};color:#ffffff;">
            ${newsletter.headerHtml || `<h1 style="margin:0;font-size:24px;line-height:1.25;">${escHtml(newsletter.subject)}</h1>`}
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:${escHtml(newsletter.textColor)};font-size:15px;line-height:1.7;background:rgba(255,255,255,.92);">
            ${newsletter.bodyHtml}
            ${videoUrl ? `<p style="margin:28px 0 0;"><a href="${escHtml(newsletter.videoUrl ?? portalUrl)}" style="display:inline-block;background:${escHtml(newsletter.primaryColor)};color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 16px;font-weight:700;">Watch the video</a></p>` : ""}
            <p style="margin:28px 0 0;"><a href="${portalUrl}" style="color:${escHtml(newsletter.primaryColor)};font-weight:700;">View this newsletter in your portal</a></p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;background:${escHtml(newsletter.accentColor)};color:#ffffff;font-size:13px;line-height:1.6;">
            ${newsletter.footerHtml || "<p style=\"margin:0;\">CEL3 Interactive</p>"}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
