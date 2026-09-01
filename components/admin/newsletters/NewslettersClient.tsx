"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RichTextEditor from "@/components/admin/email/RichTextEditor";

type NewsletterStatus = "draft" | "publishing" | "published" | "sent" | "failed";
type NewsletterTargetType = "portal_users" | "group";
type Mode = "list" | "editor" | "templates";
type Section = "body" | "header" | "footer";

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

interface NewsletterTemplate {
  id: string;
  name: string;
  description: string | null;
  headerHtml: string;
  bodyHtml: string;
  footerHtml: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Group {
  id: string;
  name: string;
  memberCount?: number;
}

type NewsletterDraft = Omit<
  Newsletter,
  "id" | "createdAt" | "publishedAt" | "emailedAt" | "portalDeliveryCount" | "emailSentCount" | "emailErrorCount"
>;

type TemplateDraft = Omit<NewsletterTemplate, "id" | "createdAt" | "updatedAt">;

const FONT_OPTIONS = [
  "Inter, Arial, sans-serif",
  "Arial, sans-serif",
  "Georgia, serif",
  "Times New Roman, serif",
  "Verdana, sans-serif",
];

const BLANK_NEWSLETTER: NewsletterDraft = {
  title: "",
  subject: "",
  summary: "",
  headerHtml: "",
  bodyHtml: "",
  footerHtml: "",
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

const BLANK_TEMPLATE: TemplateDraft = {
  name: "",
  description: "",
  headerHtml: "",
  bodyHtml: "",
  footerHtml: "",
  primaryColor: "#0ea5e9",
  accentColor: "#111827",
  backgroundColor: "#f8fafc",
  textColor: "#111827",
  fontFamily: FONT_OPTIONS[0],
  backgroundImageUrl: null,
  videoUrl: null,
};

const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-500/50 disabled:opacity-50";
const labelClass = "mb-1 block text-xs text-white/40";
const secondaryButtonClass = "inline-flex items-center justify-center rounded-lg bg-white/8 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/12 disabled:opacity-40";
const primaryButtonClass = "inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-sky-400 disabled:opacity-40";

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

function newsletterToDraft(newsletter: Newsletter): NewsletterDraft {
  return {
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
  };
}

function templateToDraft(template: NewsletterTemplate): TemplateDraft {
  return {
    name: template.name,
    description: template.description ?? "",
    headerHtml: template.headerHtml,
    bodyHtml: template.bodyHtml,
    footerHtml: template.footerHtml,
    primaryColor: template.primaryColor,
    accentColor: template.accentColor,
    backgroundColor: template.backgroundColor,
    textColor: template.textColor,
    fontFamily: template.fontFamily,
    backgroundImageUrl: template.backgroundImageUrl,
    videoUrl: template.videoUrl,
  };
}

function applyTemplateToDraft(current: NewsletterDraft, template: NewsletterTemplate): NewsletterDraft {
  return {
    ...current,
    headerHtml: template.headerHtml,
    bodyHtml: template.bodyHtml,
    footerHtml: template.footerHtml,
    primaryColor: template.primaryColor,
    accentColor: template.accentColor,
    backgroundColor: template.backgroundColor,
    textColor: template.textColor,
    fontFamily: template.fontFamily,
    backgroundImageUrl: template.backgroundImageUrl,
    videoUrl: template.videoUrl,
  };
}

function PreviewArticle({
  subject,
  summary,
  headerHtml,
  bodyHtml,
  footerHtml,
  primaryColor,
  accentColor,
  backgroundColor,
  textColor,
  fontFamily,
  backgroundImageUrl,
  videoUrl,
  compact = false,
}: {
  subject: string;
  summary: string | null;
  headerHtml: string;
  bodyHtml: string;
  footerHtml: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
  videoUrl: string | null;
  compact?: boolean;
}) {
  const embedUrl = normalizeVideoUrl(videoUrl);
  return (
    <article
      className="overflow-hidden rounded-xl border border-black/10 shadow-2xl"
      style={{
        backgroundColor,
        backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: textColor,
        fontFamily,
      }}
    >
      <div className={`${compact ? "p-5" : "p-6 md:p-8"} text-white`} style={{ backgroundColor: accentColor }}>
        {headerHtml ? (
          <div dangerouslySetInnerHTML={{ __html: headerHtml }} />
        ) : (
          <h1 className="text-2xl font-bold leading-tight">{subject || "Newsletter title"}</h1>
        )}
      </div>
      <div className={`${compact ? "p-5" : "p-6 md:p-8"} bg-white/95`}>
        <h1 className="mb-2 text-2xl font-bold leading-tight md:text-3xl" style={{ color: textColor }}>
          {subject || "Newsletter title"}
        </h1>
        {summary && <p className="mb-5 text-sm leading-6 opacity-70">{summary}</p>}
        <div
          className="text-sm leading-7 [&_a]:font-medium [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h1]:mb-3 [&_h1]:mt-7 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:my-5 [&_img]:max-w-full [&_img]:rounded-xl [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
          style={{ color: textColor, ["--tw-prose-links" as string]: primaryColor }}
          dangerouslySetInnerHTML={{ __html: bodyHtml || "<p>Your newsletter body will appear here.</p>" }}
        />
        {embedUrl && (
          <div className="mt-6 aspect-video overflow-hidden rounded-xl bg-black">
            <iframe
              src={embedUrl}
              title="Newsletter video preview"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>
      <div className={`${compact ? "p-5" : "p-6 md:p-7"} text-sm text-white`} style={{ backgroundColor: accentColor }}>
        {footerHtml ? <div dangerouslySetInnerHTML={{ __html: footerHtml }} /> : <p>CEL3 Interactive</p>}
      </div>
    </article>
  );
}

export default function NewslettersClient() {
  const [mode, setMode] = useState<Mode>("list");
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [templates, setTemplates] = useState<NewsletterTemplate[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<Newsletter | null>(null);
  const [draft, setDraft] = useState<NewsletterDraft>({ ...BLANK_NEWSLETTER });
  const [activeSection, setActiveSection] = useState<Section>("body");
  const [selectedTemplate, setSelectedTemplate] = useState<NewsletterTemplate | null>(null);
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>({ ...BLANK_TEMPLATE });
  const [activeTemplateSection, setActiveTemplateSection] = useState<Section>("body");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const locked = selected?.status === "published" || selected?.status === "sent" || selected?.status === "publishing";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [newsletterRes, templateRes, groupRes] = await Promise.all([
        fetch("/api/admin/newsletters", { cache: "no-store" }),
        fetch("/api/admin/newsletter-templates", { cache: "no-store" }),
        fetch("/api/admin/groups", { cache: "no-store" }),
      ]);
      const [newsletterData, templateData, groupData] = await Promise.all([
        newsletterRes.json(),
        templateRes.json(),
        groupRes.json(),
      ]);
      setNewsletters(newsletterData.newsletters ?? []);
      setTemplates(templateData.templates ?? []);
      setGroups(groupData.groups ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openList() {
    setMode("list");
    setSelected(null);
    setError("");
    setMessage("");
  }

  function startNew() {
    setSelected(null);
    setDraft({ ...BLANK_NEWSLETTER });
    setActiveSection("body");
    setError("");
    setMessage("");
    setMode("editor");
  }

  function editNewsletter(newsletter: Newsletter) {
    setSelected(newsletter);
    setDraft(newsletterToDraft(newsletter));
    setActiveSection("body");
    setError("");
    setMessage("");
    setMode("editor");
  }

  function openTemplates() {
    setSelectedTemplate(templates[0] ?? null);
    setTemplateDraft(templates[0] ? templateToDraft(templates[0]) : { ...BLANK_TEMPLATE });
    setActiveTemplateSection("body");
    setError("");
    setMessage("");
    setMode("templates");
  }

  function newTemplate() {
    setSelectedTemplate(null);
    setTemplateDraft({ ...BLANK_TEMPLATE });
    setActiveTemplateSection("body");
    setError("");
    setMessage("");
  }

  function editTemplate(template: NewsletterTemplate) {
    setSelectedTemplate(template);
    setTemplateDraft(templateToDraft(template));
    setActiveTemplateSection("body");
    setError("");
    setMessage("");
  }

  function applyTemplate(id: string) {
    const template = templates.find((item) => item.id === id);
    if (!template || locked) return;
    setDraft((current) => applyTemplateToDraft(current, template));
    setMessage(`Applied ${template.name}.`);
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
      setDraft(newsletterToDraft(saved));
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
      setDraft(newsletterToDraft(updated));
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
    openList();
  }

  async function saveTemplate() {
    setError("");
    setMessage("");
    if (!templateDraft.name.trim()) {
      setError("Template name is required.");
      return;
    }

    setTemplateSaving(true);
    try {
      const payload = {
        ...templateDraft,
        backgroundImageUrl: templateDraft.backgroundImageUrl || null,
        videoUrl: templateDraft.videoUrl || null,
      };
      const res = await fetch(
        selectedTemplate ? `/api/admin/newsletter-templates/${selectedTemplate.id}` : "/api/admin/newsletter-templates",
        {
          method: selectedTemplate ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Template save failed.");
        return;
      }
      const saved = data.template as NewsletterTemplate;
      setTemplates((current) => {
        const exists = current.some((item) => item.id === saved.id);
        return exists ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current];
      });
      setSelectedTemplate(saved);
      setTemplateDraft(templateToDraft(saved));
      setMessage("Template saved.");
    } finally {
      setTemplateSaving(false);
    }
  }

  async function removeTemplate() {
    if (!selectedTemplate || !window.confirm("Delete this template?")) return;
    await fetch(`/api/admin/newsletter-templates/${selectedTemplate.id}`, { method: "DELETE" });
    setTemplates((current) => current.filter((item) => item.id !== selectedTemplate.id));
    newTemplate();
  }

  const editorTitle = selected ? selected.title : "New newsletter";
  const previewData = useMemo(() => draft, [draft]);

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col gap-6">
      <div className="flex flex-col gap-3 border-b border-white/8 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-sky-300/70">
            {mode === "templates" ? "Template Library" : mode === "editor" ? "Newsletter Draft" : "Portal Newsletter"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {mode === "templates" ? "Newsletter Templates" : mode === "editor" ? editorTitle : "Newsletters"}
          </h1>
          <p className="mt-1 text-sm text-white/40">
            {mode === "templates"
              ? "Create, update, and remove reusable newsletter structures."
              : "Create portal newsletters and optionally send them by email."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {mode !== "list" && (
            <button type="button" onClick={openList} className={secondaryButtonClass}>
              Back to List
            </button>
          )}
          {mode !== "templates" && (
            <button type="button" onClick={openTemplates} className={secondaryButtonClass}>
              Templates
            </button>
          )}
          {mode !== "editor" && (
            <button type="button" onClick={startNew} className={primaryButtonClass}>
              New Newsletter
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-white/30">Loading...</div>
      ) : (
        <>
          {mode === "list" && (
            <section className="flex flex-1 flex-col gap-4">
              {newsletters.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="w-full max-w-xl rounded-2xl border border-white/8 bg-white/3 p-6 text-center md:p-10">
                    <h2 className="text-xl font-semibold text-white">No newsletters yet</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/45">
                      Start with a reusable template, publish to client portals, and choose whether to send the same issue by email.
                    </p>
                    <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                      <button type="button" onClick={startNew} className={primaryButtonClass}>
                        New Newsletter
                      </button>
                      <button type="button" onClick={openTemplates} className={secondaryButtonClass}>
                        Templates
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {newsletters.map((newsletter) => (
                    <button
                      key={newsletter.id}
                      type="button"
                      onClick={() => editNewsletter(newsletter)}
                      className="rounded-2xl border border-white/8 bg-white/3 p-5 text-left transition-colors hover:border-sky-500/35 hover:bg-sky-500/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-semibold text-white">{newsletter.title}</h2>
                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/45">{newsletter.subject}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle(newsletter.status)}`}>
                          {newsletter.status}
                        </span>
                      </div>
                      {newsletter.summary && <p className="mt-4 line-clamp-2 text-xs leading-5 text-white/35">{newsletter.summary}</p>}
                      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/30">
                        <span>{fmtDate(newsletter.publishedAt)}</span>
                        <span>{newsletter.portalDeliveryCount} portal</span>
                        {newsletter.emailSentCount > 0 && <span>{newsletter.emailSentCount} email</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {mode === "editor" && (
            <section className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,.88fr)]">
              <div className="rounded-2xl border border-white/8">
                <div className="flex flex-col gap-3 border-b border-white/8 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-300/70">{selected?.status ?? "draft"}</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">Draft</h2>
                  </div>
                  {selected && (
                    <button type="button" onClick={removeNewsletter} disabled={selected.status === "publishing"} className="text-left text-xs text-red-400/60 transition-colors hover:text-red-400 disabled:opacity-40 md:text-right">
                      Delete Newsletter
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-5 p-4 md:p-5">
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
                      <label className={labelClass}>Apply template</label>
                      <select onChange={(e) => applyTemplate(e.target.value)} disabled={locked || templates.length === 0} className={inputClass} defaultValue="">
                        <option value="" className="bg-[#111]">Choose a template</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id} className="bg-[#111]">{template.name}</option>
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
                          value={draft[key as keyof NewsletterDraft] as string}
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

                  <div className="flex gap-1 overflow-x-auto border-b border-white/8">
                    {(["body", "header", "footer"] as const).map((section) => (
                      <button
                        key={section}
                        type="button"
                        onClick={() => setActiveSection(section)}
                        className={`shrink-0 border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${activeSection === section ? "border-sky-400 text-sky-400" : "border-transparent text-white/45 hover:text-white"}`}
                      >
                        {section}
                      </button>
                    ))}
                  </div>

                  {locked ? (
                    <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-sm leading-7 text-white/70" dangerouslySetInnerHTML={{ __html: activeSection === "body" ? draft.bodyHtml : activeSection === "header" ? draft.headerHtml : draft.footerHtml }} />
                  ) : (
                    <>
                      {activeSection === "body" && (
                        <RichTextEditor key="newsletter-body" value={draft.bodyHtml} onChange={(bodyHtml) => setDraft((d) => ({ ...d, bodyHtml }))} placeholder="Write the main newsletter body..." editorHeight="min(52vh, 520px)" minHeight="320px" />
                      )}
                      {activeSection === "header" && (
                        <RichTextEditor key="newsletter-header" value={draft.headerHtml} onChange={(headerHtml) => setDraft((d) => ({ ...d, headerHtml }))} placeholder="Build the newsletter header..." editorHeight="320px" minHeight="220px" />
                      )}
                      {activeSection === "footer" && (
                        <RichTextEditor key="newsletter-footer" value={draft.footerHtml} onChange={(footerHtml) => setDraft((d) => ({ ...d, footerHtml }))} placeholder="Build the newsletter footer..." editorHeight="300px" minHeight="200px" />
                      )}
                    </>
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

                  <div className="flex flex-col gap-2 border-t border-white/8 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
                    <button type="button" onClick={saveDraft} disabled={saving || locked} className={secondaryButtonClass}>
                      {saving ? "Saving..." : "Save Draft"}
                    </button>
                    <button type="button" onClick={publish} disabled={publishing || locked || (draft.targetType === "group" && !draft.groupId)} className={primaryButtonClass}>
                      {publishing ? "Publishing..." : draft.sendEmail ? "Publish and Email" : "Publish to Portals"}
                    </button>
                    {selected?.status === "sent" && (
                      <span className="text-xs text-white/35">{selected.emailSentCount} sent, {selected.emailErrorCount} failed</span>
                    )}
                  </div>
                </div>
              </div>

              <aside className="rounded-2xl border border-white/8 bg-white/3 p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Preview</h3>
                  <span className="text-xs text-white/35">Portal view</span>
                </div>
                <PreviewArticle {...previewData} compact />
              </aside>
            </section>
          )}

          {mode === "templates" && (
            <section className="grid flex-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="flex flex-col gap-2">
                <button type="button" onClick={newTemplate} className={`${secondaryButtonClass} justify-start`}>
                  New Template
                </button>
                {templates.length === 0 && (
                  <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-5 text-sm text-white/35">
                    No templates yet.
                  </div>
                )}
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => editTemplate(template)}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${selectedTemplate?.id === template.id ? "border-sky-500/40 bg-sky-500/5" : "border-white/8 bg-white/3 hover:border-white/20"}`}
                  >
                    <p className="truncate text-sm font-medium text-white">{template.name}</p>
                    {template.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/35">{template.description}</p>}
                  </button>
                ))}
              </aside>

              <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="rounded-2xl border border-white/8">
                  <div className="flex flex-col gap-3 border-b border-white/8 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-sky-300/70">Template</p>
                      <h2 className="mt-1 text-lg font-semibold text-white">{selectedTemplate ? selectedTemplate.name : "New template"}</h2>
                    </div>
                    {selectedTemplate && (
                      <button type="button" onClick={removeTemplate} className="text-left text-xs text-red-400/60 transition-colors hover:text-red-400 md:text-right">
                        Delete Template
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-5 p-4 md:p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className={labelClass}>Template name</label>
                        <input value={templateDraft.name} onChange={(e) => setTemplateDraft((d) => ({ ...d, name: e.target.value }))} className={inputClass} placeholder="Monthly update" />
                      </div>
                      <div>
                        <label className={labelClass}>Font</label>
                        <select value={templateDraft.fontFamily} onChange={(e) => setTemplateDraft((d) => ({ ...d, fontFamily: e.target.value }))} className={inputClass}>
                          {FONT_OPTIONS.map((font) => (
                            <option key={font} value={font} className="bg-[#111]">{font.split(",")[0]}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Description</label>
                      <textarea value={templateDraft.description ?? ""} onChange={(e) => setTemplateDraft((d) => ({ ...d, description: e.target.value }))} className={`${inputClass} min-h-20 resize-y`} placeholder="What this template is best for." />
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
                            value={templateDraft[key as keyof TemplateDraft] as string}
                            onChange={(e) => setTemplateDraft((d) => ({ ...d, [key]: e.target.value }))}
                            className="h-10 w-full rounded-lg border border-white/10 bg-white/5 p-1"
                          />
                        </label>
                      ))}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className={labelClass}>Background image URL</label>
                        <input value={templateDraft.backgroundImageUrl ?? ""} onChange={(e) => setTemplateDraft((d) => ({ ...d, backgroundImageUrl: e.target.value }))} className={inputClass} placeholder="https://..." />
                      </div>
                      <div>
                        <label className={labelClass}>Embedded video URL</label>
                        <input value={templateDraft.videoUrl ?? ""} onChange={(e) => setTemplateDraft((d) => ({ ...d, videoUrl: e.target.value }))} className={inputClass} placeholder="YouTube, Vimeo, or direct URL" />
                      </div>
                    </div>

                    <div className="flex gap-1 overflow-x-auto border-b border-white/8">
                      {(["body", "header", "footer"] as const).map((section) => (
                        <button
                          key={section}
                          type="button"
                          onClick={() => setActiveTemplateSection(section)}
                          className={`shrink-0 border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTemplateSection === section ? "border-sky-400 text-sky-400" : "border-transparent text-white/45 hover:text-white"}`}
                        >
                          {section}
                        </button>
                      ))}
                    </div>

                    {activeTemplateSection === "body" && (
                      <RichTextEditor key="template-body" value={templateDraft.bodyHtml} onChange={(bodyHtml) => setTemplateDraft((d) => ({ ...d, bodyHtml }))} placeholder="Write reusable body content..." editorHeight="min(48vh, 480px)" minHeight="300px" />
                    )}
                    {activeTemplateSection === "header" && (
                      <RichTextEditor key="template-header" value={templateDraft.headerHtml} onChange={(headerHtml) => setTemplateDraft((d) => ({ ...d, headerHtml }))} placeholder="Build a reusable header..." editorHeight="320px" minHeight="220px" />
                    )}
                    {activeTemplateSection === "footer" && (
                      <RichTextEditor key="template-footer" value={templateDraft.footerHtml} onChange={(footerHtml) => setTemplateDraft((d) => ({ ...d, footerHtml }))} placeholder="Build a reusable footer..." editorHeight="300px" minHeight="200px" />
                    )}

                    {error && <p className="text-sm text-red-300">{error}</p>}
                    {message && <p className="text-sm text-emerald-300">{message}</p>}

                    <div className="flex flex-col gap-2 border-t border-white/8 pt-5 sm:flex-row sm:flex-wrap">
                      <button type="button" onClick={saveTemplate} disabled={templateSaving} className={primaryButtonClass}>
                        {templateSaving ? "Saving..." : "Save Template"}
                      </button>
                      <button type="button" onClick={newTemplate} className={secondaryButtonClass}>
                        Clear Form
                      </button>
                    </div>
                  </div>
                </div>

                <aside className="rounded-2xl border border-white/8 bg-white/3 p-4 md:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Preview</h3>
                    <span className="text-xs text-white/35">Template</span>
                  </div>
                  <PreviewArticle
                    subject={templateDraft.name || "Template preview"}
                    summary={templateDraft.description}
                    headerHtml={templateDraft.headerHtml}
                    bodyHtml={templateDraft.bodyHtml}
                    footerHtml={templateDraft.footerHtml}
                    primaryColor={templateDraft.primaryColor}
                    accentColor={templateDraft.accentColor}
                    backgroundColor={templateDraft.backgroundColor}
                    textColor={templateDraft.textColor}
                    fontFamily={templateDraft.fontFamily}
                    backgroundImageUrl={templateDraft.backgroundImageUrl}
                    videoUrl={templateDraft.videoUrl}
                    compact
                  />
                </aside>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
