"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RichTextEditor from "@/components/admin/email/RichTextEditor";

type NewsletterStatus = "draft" | "publishing" | "published" | "sent" | "failed";
type NewsletterTargetType = "portal_users" | "group";

interface Newsletter {
  id: string;
  title: string;
  subject: string;
  summary: string | null;
  headerHtml: string;
  bodyHtml: string;
  footerHtml: string;
  status: NewsletterStatus;
  targetType: NewsletterTargetType;
  groupId: string | null;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
  videoUrl: string | null;
  sendEmail: boolean;
  publishedAt: string | null;
  emailedAt: string | null;
  createdAt: string;
  portalDeliveryCount: number;
  emailSentCount: number;
  emailErrorCount: number;
}

interface Group {
  id: string;
  name: string;
  memberCount?: number;
}

const FONT_OPTIONS = [
  "Inter, Arial, sans-serif",
  "Arial, sans-serif",
  "Georgia, serif",
  "Times New Roman, serif",
  "Verdana, sans-serif",
];

const TEMPLATES = [
  {
    id: "monthly",
    label: "Monthly update",
    headerHtml: "<p style=\"margin:0;font-size:13px;letter-spacing:.16em;text-transform:uppercase;opacity:.75;\">Client Newsletter</p><h1 style=\"margin:8px 0 0;font-size:30px;line-height:1.15;\">Monthly project notes</h1>",
    bodyHtml: "<h2>Highlights</h2><p>Share the most important updates, wins, and next steps for your clients.</p><h2>What is next</h2><p>Add the work clients should expect to see next.</p>",
    footerHtml: "<p style=\"margin:0;font-weight:700;\">CEL3 Interactive</p><p style=\"margin:6px 0 0;opacity:.75;\">Built for clients, operators, and teams moving work forward.</p>",
  },
  {
    id: "launch",
    label: "Launch note",
    headerHtml: "<p style=\"margin:0;font-size:13px;letter-spacing:.16em;text-transform:uppercase;opacity:.75;\">Launch Update</p><h1 style=\"margin:8px 0 0;font-size:30px;line-height:1.15;\">A new release is live</h1>",
    bodyHtml: "<h2>What changed</h2><p>Describe the release and why it matters.</p><h2>How to use it</h2><p>Give clients a direct next action.</p>",
    footerHtml: "<p style=\"margin:0;font-weight:700;\">Questions?</p><p style=\"margin:6px 0 0;opacity:.75;\">Reply to this email or message us from your portal.</p>",
  },
  {
    id: "resources",
    label: "Resource roundup",
    headerHtml: "<p style=\"margin:0;font-size:13px;letter-spacing:.16em;text-transform:uppercase;opacity:.75;\">Resource Roundup</p><h1 style=\"margin:8px 0 0;font-size:30px;line-height:1.15;\">Useful links and ideas</h1>",
    bodyHtml: "<h2>Recommended reading</h2><ul><li>Add a helpful article or guide.</li><li>Add a product, process, or training note.</li></ul><h2>Featured resource</h2><p>Highlight one thing clients should not miss.</p>",
    footerHtml: "<p style=\"margin:0;font-weight:700;\">CEL3 Interactive</p><p style=\"margin:6px 0 0;opacity:.75;\">More resources are available in your client portal.</p>",
  },
];

const BLANK: Omit<Newsletter, "id" | "createdAt" | "publishedAt" | "emailedAt" | "portalDeliveryCount" | "emailSentCount" | "emailErrorCount"> = {
  title: "",
  subject: "",
  summary: "",
  headerHtml: TEMPLATES[0].headerHtml,
  bodyHtml: TEMPLATES[0].bodyHtml,
  footerHtml: TEMPLATES[0].footerHtml,
  status: "draft",
  targetType: "portal_users",
  groupId: null,
  primaryColor: "#0ea5e9",
  accentColor: "#111827",
  backgroundColor: "#f8fafc",
  textColor: "#111827",
  fontFamily: FONT_OPTIONS[0],
  backgroundImageUrl: null,
  videoUrl: null,
  sendEmail: false,
};

function statusStyle(status: NewsletterStatus) {
  const map: Record<NewsletterStatus, string> = {
    draft: "bg-white/8 text-white/50",
    publishing: "bg-sky-500/15 text-sky-300",
    published: "bg-emerald-500/15 text-emerald-300",
    sent: "bg-violet-500/15 text-violet-300",
    failed: "bg-red-500/15 text-red-300",
  };
  return map[status];
}

function fmtDate(value: string | null) {
  if (!value) return "Not published";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function normalizeVideoUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : value;
    }
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : value;
    }
    if (url.hostname.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : value;
    }
    return value;
  } catch {
    return null;
  }
}

export default function NewslettersClient() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<Newsletter | null>(null);
  const [draft, setDraft] = useState({ ...BLANK });
  const [creating, setCreating] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeSection, setActiveSection] = useState<"body" | "header" | "footer">("body");

  const locked = selected?.status === "published" || selected?.status === "sent" || selected?.status === "publishing";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [newsletterRes, groupRes] = await Promise.all([
        fetch("/api/admin/newsletters", { cache: "no-store" }),
        fetch("/api/admin/groups", { cache: "no-store" }),
      ]);
      const [newsletterData, groupData] = await Promise.all([newsletterRes.json(), groupRes.json()]);
      setNewsletters(newsletterData.newsletters ?? []);
      setGroups(groupData.groups ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function startNew() {
    setSelected(null);
    setDraft({ ...BLANK });
    setCreating(true);
    setError("");
    setMessage("");
    setActiveSection("body");
  }

  function selectNewsletter(newsletter: Newsletter) {
    setSelected(newsletter);
    setDraft({
      title: newsletter.title,
      subject: newsletter.subject,
      summary: newsletter.summary ?? "",
      headerHtml: newsletter.headerHtml,
      bodyHtml: newsletter.bodyHtml,
      footerHtml: newsletter.footerHtml,
      status: newsletter.status,
      targetType: newsletter.targetType,
      groupId: newsletter.groupId,
      primaryColor: newsletter.primaryColor,
      accentColor: newsletter.accentColor,
      backgroundColor: newsletter.backgroundColor,
      textColor: newsletter.textColor,
      fontFamily: newsletter.fontFamily,
      backgroundImageUrl: newsletter.backgroundImageUrl,
      videoUrl: newsletter.videoUrl,
      sendEmail: newsletter.sendEmail,
    });
    setCreating(false);
    setError("");
    setMessage("");
    setActiveSection("body");
  }

  function applyTemplate(id: string) {
    const template = TEMPLATES.find((item) => item.id === id);
    if (!template || locked) return;
    setDraft((current) => ({
      ...current,
      headerHtml: template.headerHtml,
      bodyHtml: template.bodyHtml,
      footerHtml: template.footerHtml,
    }));
  }

  async function saveDraft() {
    setError("");
    setMessage("");
    if (!draft.title.trim()) {
      setError("Title is required.");
      return null;
    }
    if (!draft.subject.trim()) {
      setError("Subject is required.");
      return null;
    }

    setSaving(true);
    try {
      const payload = {
        ...draft,
        groupId: draft.targetType === "group" ? draft.groupId : null,
        backgroundImageUrl: draft.backgroundImageUrl || null,
        videoUrl: draft.videoUrl || null,
      };
      const res = await fetch(selected ? `/api/admin/newsletters/${selected.id}` : "/api/admin/newsletters", {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        return null;
      }
      const saved = data.newsletter as Newsletter;
      setNewsletters((current) => {
        const exists = current.some((item) => item.id === saved.id);
        return exists ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current];
      });
      setSelected(saved);
      setCreating(false);
      setMessage("Draft saved.");
      return saved;
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    const saved = locked ? selected : await saveDraft();
    if (!saved) return;
    setError("");
    setMessage("");
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/newsletters/${saved.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", sendEmail: draft.sendEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Publish failed.");
        return;
      }
      const updated = data.newsletter as Newsletter;
      setSelected(updated);
      setDraft((current) => ({ ...current, status: updated.status }));
      setNewsletters((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage(`Published to ${data.portalDeliveries ?? 0} portal users${data.emailSent ? ` and emailed ${data.emailSent}` : ""}.`);
    } finally {
      setPublishing(false);
    }
  }

  async function removeNewsletter() {
    if (!selected || !window.confirm("Delete this newsletter?")) return;
    await fetch(`/api/admin/newsletters/${selected.id}`, { method: "DELETE" });
    setNewsletters((current) => current.filter((item) => item.id !== selected.id));
    startNew();
  }

  const previewVideoUrl = useMemo(() => normalizeVideoUrl(draft.videoUrl), [draft.videoUrl]);
  const rowClass = "rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-left transition-colors hover:border-white/20";
  const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-500/50 disabled:opacity-50";
  const labelClass = "mb-1 block text-xs text-white/40";

  return (
    <div className="flex h-full min-h-[calc(100vh-120px)] flex-col gap-6">
      <div className="flex flex-col gap-3 border-b border-white/8 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Newsletters</h1>
          <p className="mt-1 text-sm text-white/40">Create portal newsletters and optionally send them by email.</p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-sky-400"
        >
          New Newsletter
        </button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-white/30">Loading...</div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col gap-2 overflow-y-auto">
            {newsletters.length === 0 && (
              <p className="rounded-xl border border-white/8 bg-white/3 px-4 py-5 text-sm text-white/35">
                No newsletters yet.
              </p>
            )}
            {newsletters.map((newsletter) => (
              <button
                key={newsletter.id}
                type="button"
                onClick={() => selectNewsletter(newsletter)}
                className={`${rowClass} ${selected?.id === newsletter.id ? "border-sky-500/40 bg-sky-500/5" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-white">{newsletter.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle(newsletter.status)}`}>
                    {newsletter.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-white/35">{newsletter.subject}</p>
                <p className="mt-1 text-xs text-white/25">
                  {fmtDate(newsletter.publishedAt)} · {newsletter.portalDeliveryCount} portal
                </p>
              </button>
            ))}
          </aside>

          <div className="grid min-h-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="min-h-0 overflow-y-auto rounded-2xl border border-white/8">
              <div className="border-b border-white/8 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-300/70">
                      {creating ? "Draft" : selected?.status ?? "Draft"}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                      {creating ? "Create newsletter" : selected?.title}
                    </h2>
                  </div>
                  {selected && (
                    <button type="button" onClick={removeNewsletter} disabled={selected.status === "publishing"} className="text-xs text-red-400/60 transition-colors hover:text-red-400 disabled:opacity-40">
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-5 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Internal title</label>
                    <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} disabled={locked} className={inputClass} placeholder="September client update" />
                  </div>
                  <div>
                    <label className={labelClass}>Email subject / portal title</label>
                    <input value={draft.subject} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} disabled={locked} className={inputClass} placeholder="What clients will see" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Dashboard summary</label>
                  <textarea value={draft.summary ?? ""} onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))} disabled={locked} className={`${inputClass} min-h-20 resize-y`} placeholder="Short preview shown in the portal archive." />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Template</label>
                    <select onChange={(e) => applyTemplate(e.target.value)} disabled={locked} className={inputClass} defaultValue="">
                      <option value="" className="bg-[#111]">Choose a section template</option>
                      {TEMPLATES.map((template) => (
                        <option key={template.id} value={template.id} className="bg-[#111]">{template.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Font</label>
                    <select value={draft.fontFamily} onChange={(e) => setDraft((d) => ({ ...d, fontFamily: e.target.value }))} disabled={locked} className={inputClass}>
                      {FONT_OPTIONS.map((font) => (
                        <option key={font} value={font} className="bg-[#111]">{font.split(",")[0]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Primary", "primaryColor"],
                    ["Accent", "accentColor"],
                    ["Background", "backgroundColor"],
                    ["Text", "textColor"],
                  ].map(([label, key]) => (
                    <label key={key} className="block">
                      <span className={labelClass}>{label}</span>
                      <input
                        type="color"
                        value={draft[key as keyof typeof draft] as string}
                        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                        disabled={locked}
                        className="h-10 w-full rounded-lg border border-white/10 bg-white/5 p-1 disabled:opacity-50"
                      />
                    </label>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Background image URL</label>
                    <input value={draft.backgroundImageUrl ?? ""} onChange={(e) => setDraft((d) => ({ ...d, backgroundImageUrl: e.target.value }))} disabled={locked} className={inputClass} placeholder="https://..." />
                  </div>
                  <div>
                    <label className={labelClass}>Embedded video URL</label>
                    <input value={draft.videoUrl ?? ""} onChange={(e) => setDraft((d) => ({ ...d, videoUrl: e.target.value }))} disabled={locked} className={inputClass} placeholder="YouTube, Vimeo, or direct URL" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Publish to</label>
                    <select value={draft.targetType} onChange={(e) => setDraft((d) => ({ ...d, targetType: e.target.value as NewsletterTargetType }))} disabled={locked} className={inputClass}>
                      <option value="portal_users" className="bg-[#111]">All portal users</option>
                      <option value="group" className="bg-[#111]">Specific group</option>
                    </select>
                  </div>
                  {draft.targetType === "group" && (
                    <div>
                      <label className={labelClass}>Group</label>
                      <select value={draft.groupId ?? ""} onChange={(e) => setDraft((d) => ({ ...d, groupId: e.target.value || null }))} disabled={locked} className={inputClass}>
                        <option value="" className="bg-[#111]">Select a group</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id} className="bg-[#111]">{group.name} ({group.memberCount ?? 0})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-1 border-b border-white/8">
                  {(["body", "header", "footer"] as const).map((section) => (
                    <button
                      key={section}
                      type="button"
                      onClick={() => setActiveSection(section)}
                      className={`border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${activeSection === section ? "border-sky-400 text-sky-400" : "border-transparent text-white/45 hover:text-white"}`}
                    >
                      {section}
                    </button>
                  ))}
                </div>

                {activeSection === "body" && (
                  <RichTextEditor value={draft.bodyHtml} onChange={(bodyHtml) => setDraft((d) => ({ ...d, bodyHtml }))} placeholder="Write the main newsletter body..." editorHeight="420px" />
                )}
                {activeSection === "header" && (
                  <RichTextEditor value={draft.headerHtml} onChange={(headerHtml) => setDraft((d) => ({ ...d, headerHtml }))} placeholder="Build the newsletter header..." editorHeight="240px" />
                )}
                {activeSection === "footer" && (
                  <RichTextEditor value={draft.footerHtml} onChange={(footerHtml) => setDraft((d) => ({ ...d, footerHtml }))} placeholder="Build the newsletter footer..." editorHeight="240px" />
                )}

                <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/3 p-4">
                  <input
                    type="checkbox"
                    checked={draft.sendEmail}
                    onChange={(e) => setDraft((d) => ({ ...d, sendEmail: e.target.checked }))}
                    disabled={locked}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-white">Send as email when published</span>
                    <span className="mt-1 block text-xs text-white/40">The newsletter will always publish to the selected client portals.</span>
                  </span>
                </label>

                {error && <p className="text-sm text-red-300">{error}</p>}
                {message && <p className="text-sm text-emerald-300">{message}</p>}

                <div className="flex flex-wrap items-center gap-2 border-t border-white/8 pt-5">
                  <button type="button" onClick={saveDraft} disabled={saving || locked} className="rounded-lg bg-white/8 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/12 disabled:opacity-40">
                    {saving ? "Saving..." : "Save Draft"}
                  </button>
                  <button type="button" onClick={publish} disabled={publishing || locked || (draft.targetType === "group" && !draft.groupId)} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-sky-400 disabled:opacity-40">
                    {publishing ? "Publishing..." : draft.sendEmail ? "Publish and Email" : "Publish to Portals"}
                  </button>
                  {selected?.status === "sent" && (
                    <span className="text-xs text-white/35">{selected.emailSentCount} sent, {selected.emailErrorCount} failed</span>
                  )}
                </div>
              </div>
            </section>

            <aside className="min-h-0 overflow-y-auto rounded-2xl border border-white/8 bg-white/3 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Preview</h3>
                <span className="text-xs text-white/35">Portal view</span>
              </div>
              <article
                className="overflow-hidden rounded-xl border border-black/10 shadow-2xl"
                style={{
                  backgroundColor: draft.backgroundColor,
                  backgroundImage: draft.backgroundImageUrl ? `url(${draft.backgroundImageUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  color: draft.textColor,
                  fontFamily: draft.fontFamily,
                }}
              >
                <div className="p-6 text-white" style={{ backgroundColor: draft.accentColor }} dangerouslySetInnerHTML={{ __html: draft.headerHtml }} />
                <div className="bg-white/95 p-6">
                  <h1 className="mb-2 text-2xl font-bold" style={{ color: draft.textColor }}>{draft.subject || "Newsletter title"}</h1>
                  {draft.summary && <p className="mb-5 text-sm opacity-70">{draft.summary}</p>}
                  <div className="newsletter-preview text-sm leading-7 [&_a]:underline [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: draft.bodyHtml }} />
                  {previewVideoUrl && (
                    <div className="mt-5 aspect-video overflow-hidden rounded-xl bg-black">
                      <iframe src={previewVideoUrl} title="Newsletter video preview" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                  )}
                </div>
                <div className="p-5 text-sm text-white" style={{ backgroundColor: draft.accentColor }} dangerouslySetInnerHTML={{ __html: draft.footerHtml }} />
              </article>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
