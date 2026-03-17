"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type BodySection = {
  heading: string;
  content: string;
};

export type CaseStudyFormData = {
  title: string;
  slug: string;
  summary: string;
  featured: boolean;
  client: string;
  industry: string;
  timeline: string;
  stack: string[];
  results: string[];
  sections: BodySection[];
  heroImage: { _type: "image"; asset: { _type: "reference"; _ref: string } } | null;
  gallery: { _type: "image"; asset: { _type: "reference"; _ref: string } }[];
  heroImagePreview: string | null;
  galleryPreviews: string[];
};

type Props = {
  initial?: Partial<CaseStudyFormData> & { _id?: string; body?: unknown[] };
  mode: "create" | "edit";
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function bodyToSections(body: unknown[]): BodySection[] {
  if (!body || body.length === 0) return [{ heading: "", content: "" }];
  const sections: BodySection[] = [];
  let currentSection: BodySection | null = null;

  for (const block of body as Array<{ _type: string; style?: string; children?: Array<{ text: string }> }>) {
    if (block._type === "block") {
      const text = block.children?.map((c) => c.text).join("") || "";
      if (block.style === "h2") {
        if (currentSection) sections.push(currentSection);
        currentSection = { heading: text, content: "" };
      } else {
        if (!currentSection) currentSection = { heading: "", content: "" };
        currentSection.content += (currentSection.content ? "\n\n" : "") + text;
      }
    }
  }
  if (currentSection) sections.push(currentSection);
  return sections.length ? sections : [{ heading: "", content: "" }];
}

function sectionsToBody(sections: BodySection[]) {
  const blocks: unknown[] = [];
  for (const section of sections) {
    if (section.heading) {
      blocks.push({
        _type: "block",
        _key: `h_${Math.random().toString(36).slice(2)}`,
        style: "h2",
        children: [{ _type: "span", _key: "s0", text: section.heading, marks: [] }],
        markDefs: [],
      });
    }
    if (section.content) {
      const paragraphs = section.content.split(/\n\n+/);
      for (const para of paragraphs) {
        if (para.trim()) {
          blocks.push({
            _type: "block",
            _key: `p_${Math.random().toString(36).slice(2)}`,
            style: "normal",
            children: [{ _type: "span", _key: "s0", text: para.trim(), marks: [] }],
            markDefs: [],
          });
        }
      }
    }
  }
  return blocks;
}

export default function CaseStudyForm({ initial, mode }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<CaseStudyFormData>({
    title: initial?.title || "",
    slug: initial?.slug || "",
    summary: initial?.summary || "",
    featured: initial?.featured || false,
    client: initial?.client || "",
    industry: initial?.industry || "",
    timeline: initial?.timeline || "",
    stack: initial?.stack || [],
    results: initial?.results || [],
    sections: initial?.sections || bodyToSections((initial as { body?: unknown[] })?.body || []),
    heroImage: initial?.heroImage || null,
    gallery: initial?.gallery || [],
    heroImagePreview: initial?.heroImagePreview || null,
    galleryPreviews: initial?.galleryPreviews || [],
  });

  const [stackInput, setStackInput] = useState("");
  const [resultInput, setResultInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const heroRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handleTitleChange(v: string) {
    setForm((f) => ({ ...f, title: v, slug: f.slug || slugify(v) }));
  }

  async function uploadImage(file: File): Promise<{ _type: "image"; asset: { _type: "reference"; _ref: string } }> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  }

  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    try {
      const asset = await uploadImage(file);
      const preview = URL.createObjectURL(file);
      setForm((f) => ({ ...f, heroImage: asset, heroImagePreview: preview }));
    } catch {
      setError("Hero image upload failed");
    } finally {
      setUploadingHero(false);
    }
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingGallery(true);
    try {
      const assets = await Promise.all(files.map(uploadImage));
      const previews = files.map((f) => URL.createObjectURL(f));
      setForm((f) => ({
        ...f,
        gallery: [...f.gallery, ...assets],
        galleryPreviews: [...f.galleryPreviews, ...previews],
      }));
    } catch {
      setError("Gallery upload failed");
    } finally {
      setUploadingGallery(false);
    }
  }

  function removeGalleryItem(i: number) {
    setForm((f) => ({
      ...f,
      gallery: f.gallery.filter((_, j) => j !== i),
      galleryPreviews: f.galleryPreviews.filter((_, j) => j !== i),
    }));
  }

  function addStack() {
    const v = stackInput.trim();
    if (v && !form.stack.includes(v)) {
      setForm((f) => ({ ...f, stack: [...f.stack, v] }));
    }
    setStackInput("");
  }

  function addResult() {
    const v = resultInput.trim();
    if (v) setForm((f) => ({ ...f, results: [...f.results, v] }));
    setResultInput("");
  }

  function updateSection(i: number, field: "heading" | "content", value: string) {
    setForm((f) => {
      const sections = [...f.sections];
      sections[i] = { ...sections[i], [field]: value };
      return { ...f, sections };
    });
  }

  function addSection() {
    setForm((f) => ({ ...f, sections: [...f.sections, { heading: "", content: "" }] }));
  }

  function removeSection(i: number) {
    setForm((f) => ({ ...f, sections: f.sections.filter((_, j) => j !== i) }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        summary: form.summary,
        featured: form.featured,
        client: form.client,
        industry: form.industry,
        timeline: form.timeline,
        stack: form.stack,
        results: form.results,
        body: sectionsToBody(form.sections),
        ...(form.heroImage ? { heroImage: form.heroImage } : {}),
        gallery: form.gallery,
      };

      const url = mode === "create"
        ? "/api/admin/case-studies"
        : `/api/admin/case-studies/${(initial as { _id?: string })?._id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Save failed");
        return;
      }
      router.push("/admin/case-studies");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this case study? This cannot be undone.")) return;
    setDeleting(true);
    const id = (initial as { _id?: string })?._id;
    try {
      await fetch(`/api/admin/case-studies/${id}`, { method: "DELETE" });
      router.push("/admin/case-studies");
      router.refresh();
    } catch {
      setError("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-sky-400/50 transition-colors";
  const labelCls = "block text-xs text-white/50 mb-1.5 tracking-wide uppercase";

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Basic Info */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Basic Info</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Title *</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="GriotOS"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Slug *</label>
            <input
              className={inputCls}
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
              placeholder="griotos"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Client</label>
            <input className={inputCls} value={form.client} onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))} placeholder="Internal Product" />
          </div>
          <div>
            <label className={labelCls}>Industry</label>
            <input className={inputCls} value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} placeholder="Marketing Technology" />
          </div>
          <div>
            <label className={labelCls}>Timeline</label>
            <input className={inputCls} value={form.timeline} onChange={(e) => setForm((f) => ({ ...f, timeline: e.target.value }))} placeholder="Q1 2025 – Q2 2025" />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              />
              <div className="w-10 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
              <span className="ml-3 text-sm text-white/70">Featured on homepage</span>
            </label>
          </div>
        </div>

        <div>
          <label className={labelCls}>Summary</label>
          <textarea
            className={`${inputCls} min-h-[80px] resize-y`}
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            placeholder="Short description shown on cards and the work index..."
          />
        </div>
      </section>

      {/* Tech Stack */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Tech Stack</h2>
        <div className="flex gap-2">
          <input
            className={`${inputCls} flex-1`}
            value={stackInput}
            onChange={(e) => setStackInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStack(); } }}
            placeholder="Next.js, React, TypeScript..."
          />
          <button type="button" onClick={addStack} className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm text-white transition-colors">Add</button>
        </div>
        {form.stack.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.stack.map((s) => (
              <span key={s} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs">
                {s}
                <button type="button" onClick={() => setForm((f) => ({ ...f, stack: f.stack.filter((x) => x !== s) }))} className="text-sky-400/60 hover:text-sky-300">×</button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Results */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Results / Outcomes</h2>
        <div className="flex gap-2">
          <input
            className={`${inputCls} flex-1`}
            value={resultInput}
            onChange={(e) => setResultInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addResult(); } }}
            placeholder="Reduced onboarding time by 40%..."
          />
          <button type="button" onClick={addResult} className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm text-white transition-colors">Add</button>
        </div>
        {form.results.length > 0 && (
          <ul className="space-y-2">
            {form.results.map((r, i) => (
              <li key={i} className="flex items-start gap-2 bg-white/5 rounded-xl px-4 py-2.5 text-sm text-white/80">
                <span className="flex-1">{r}</span>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, results: f.results.filter((_, j) => j !== i) }))}
                  className="text-white/30 hover:text-red-400 transition-colors shrink-0"
                >×</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Body Sections */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Content Sections</h2>
          <button
            type="button"
            onClick={addSection}
            className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >+ Add section</button>
        </div>
        <p className="text-xs text-white/30">Each section has an optional heading (H2) and body text. Separate paragraphs with a blank line.</p>
        <div className="space-y-4">
          {form.sections.map((section, i) => (
            <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Section {i + 1}</span>
                {form.sections.length > 1 && (
                  <button type="button" onClick={() => removeSection(i)} className="text-xs text-red-400/60 hover:text-red-400">Remove</button>
                )}
              </div>
              <input
                className={inputCls}
                value={section.heading}
                onChange={(e) => updateSection(i, "heading", e.target.value)}
                placeholder="Section heading (e.g. Problem, Approach, Results)"
              />
              <textarea
                className={`${inputCls} min-h-[120px] resize-y`}
                value={section.content}
                onChange={(e) => updateSection(i, "content", e.target.value)}
                placeholder="Section body text. Use blank lines to separate paragraphs."
              />
            </div>
          ))}
        </div>
      </section>

      {/* Hero Image */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Hero Image</h2>
        <div className="border border-dashed border-white/15 rounded-xl p-4">
          {form.heroImagePreview || form.heroImage ? (
            <div className="relative">
              {form.heroImagePreview && (
                <img src={form.heroImagePreview} alt="Hero preview" className="w-full max-h-48 object-cover rounded-lg" />
              )}
              {!form.heroImagePreview && form.heroImage && (
                <div className="text-sm text-white/50 py-2">Hero image set (existing asset)</div>
              )}
              <button
                type="button"
                onClick={() => { setForm((f) => ({ ...f, heroImage: null, heroImagePreview: null })); }}
                className="mt-2 text-xs text-red-400/60 hover:text-red-400"
              >Remove hero image</button>
            </div>
          ) : (
            <div className="text-center py-4">
              <button
                type="button"
                onClick={() => heroRef.current?.click()}
                disabled={uploadingHero}
                className="text-sm text-sky-400 hover:text-sky-300 disabled:opacity-50"
              >
                {uploadingHero ? "Uploading…" : "Click to upload hero image"}
              </button>
              <p className="text-xs text-white/20 mt-1">JPG, PNG, WebP</p>
            </div>
          )}
          <input ref={heroRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
        </div>
      </section>

      {/* Gallery */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Gallery</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {form.galleryPreviews.map((src, i) => (
            <div key={i} className="relative group">
              <img src={src} alt="" className="w-full aspect-square object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => removeGalleryItem(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >×</button>
            </div>
          ))}
          {form.gallery.length > form.galleryPreviews.length && (
            <div className="aspect-square bg-white/5 rounded-lg flex items-center justify-center text-xs text-white/30">
              +{form.gallery.length - form.galleryPreviews.length} existing
            </div>
          )}
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={uploadingGallery}
            className="aspect-square border border-dashed border-white/15 rounded-lg flex flex-col items-center justify-center text-sm text-white/40 hover:text-white/60 hover:border-white/30 transition-colors disabled:opacity-50"
          >
            <span className="text-2xl leading-none">+</span>
            <span className="text-xs mt-1">{uploadingGallery ? "Uploading…" : "Add images"}</span>
          </button>
        </div>
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
      </section>

      {/* Actions */}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3 pt-2 border-t border-white/8">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-semibold text-sm transition-colors"
        >
          {saving ? "Saving…" : mode === "create" ? "Create Case Study" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/case-studies")}
          className="px-6 py-2.5 rounded-xl border border-white/10 hover:border-white/25 text-white/60 hover:text-white text-sm transition-colors"
        >
          Cancel
        </button>
        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto px-6 py-2.5 rounded-xl border border-red-500/30 hover:border-red-500/60 text-red-400 hover:text-red-300 text-sm transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete Case Study"}
          </button>
        )}
      </div>
    </form>
  );
}
