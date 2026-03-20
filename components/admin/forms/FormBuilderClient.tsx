"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Cel3Form, FormField, FormNotification, FieldType, ConditionalLogic, ConditionalOperator,
  FIELD_TYPE_LABELS, slugify, makeField,
} from "@/lib/forms";

// ─── Shared style tokens ──────────────────────────────────────────────────────
const CLS_INPUT = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-sky-400/50 transition-colors";
const CLS_LABEL = "block text-xs text-white/50 mb-1.5 tracking-wide uppercase";
const CLS_BTN_PRIMARY = "px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-semibold text-sm transition-colors";
const CLS_BTN_SEC = "px-5 py-2 rounded-xl border border-white/10 hover:border-white/25 text-white/60 hover:text-white text-sm transition-colors";
const CLS_BTN_DANGER = "px-4 py-1.5 rounded-lg border border-red-500/30 hover:border-red-500/60 text-red-400 hover:text-red-300 text-xs transition-colors";

const ALL_FIELD_TYPES: FieldType[] = [
  "text","textarea","number","email","phone","date",
  "dropdown","checkbox","radio","file_upload","section_header",
];
const HAS_OPTIONS: FieldType[] = ["dropdown","checkbox","radio"];
const HAS_FILE_CFG: FieldType[] = ["file_upload"];

type Tab = "fields" | "settings" | "notifications";

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${value ? "bg-sky-500" : "bg-white/15"}`}
    >
      <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

const DEFAULT_CL: ConditionalLogic = { enabled: false, action: "show", fieldId: "", operator: "equals", value: "" };

function operatorLabel(op: ConditionalOperator): string {
  return { equals: "equals", not_equals: "doesn't equal", is_empty: "is empty", is_not_empty: "is not empty" }[op] ?? op;
}

// ─── FieldCard ────────────────────────────────────────────────────────────────
function FieldCard({
  field, allFields, expanded, onToggle, onUpdate, onRemove, onMoveUp, onMoveDown,
}: {
  field: FormField;
  allFields: FormField[];
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (u: Partial<FormField>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const isHeader = field.fieldType === "section_header";
  const hasOpts = HAS_OPTIONS.includes(field.fieldType);
  const isFile = HAS_FILE_CFG.includes(field.fieldType);
  const optionsText = (field.options || []).join("\n");

  // Conditional logic helpers
  const cl: ConditionalLogic = field.conditionalLogic ?? DEFAULT_CL;
  function updateCL(updates: Partial<ConditionalLogic>) {
    onUpdate({ conditionalLogic: { ...cl, ...updates } });
  }
  // Candidates are all non-header fields except this one, in current order
  const triggerCandidates = allFields.filter(f => f.id !== field.id && f.fieldType !== "section_header");
  const triggerField = triggerCandidates.find(f => f.id === cl.fieldId);
  const needsValue = cl.operator === "equals" || cl.operator === "not_equals";
  // Inline select style
  const SEL = "bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-sky-400/50 transition-colors";

  return (
    <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
      {/* Bar */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" onClick={onToggle} className="flex-1 flex items-center gap-3 text-left min-w-0">
          <span className="text-xs px-2 py-0.5 rounded bg-white/8 text-white/40 shrink-0">
            {FIELD_TYPE_LABELS[field.fieldType]}
          </span>
          <span className={`text-sm truncate ${field.label ? "text-white" : "text-white/25"}`}>
            {field.label || "Untitled field"}
          </span>
          {field.isRequired && !isHeader && (
            <span className="text-xs text-sky-400 shrink-0">Required</span>
          )}
          {cl.enabled && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 shrink-0">If/Then</span>
          )}
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          {onMoveUp && (
            <button type="button" onClick={onMoveUp} className="p-1.5 text-white/25 hover:text-white transition-colors">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </button>
          )}
          {onMoveDown && (
            <button type="button" onClick={onMoveDown} className="p-1.5 text-white/25 hover:text-white transition-colors">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          )}
          <button type="button" onClick={onRemove} className="p-1.5 ml-1 text-white/20 hover:text-red-400 transition-colors">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div className="border-t border-white/8 px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={CLS_LABEL}>Field Type</label>
              <select
                value={field.fieldType}
                onChange={e => onUpdate({ fieldType: e.target.value as FieldType, options: [] })}
                className={CLS_INPUT + " bg-white/5"}
              >
                {ALL_FIELD_TYPES.map(t => (
                  <option key={t} value={t} className="bg-[#0a0a0a]">{FIELD_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={CLS_LABEL}>Label</label>
              <input
                value={field.label}
                onChange={e => onUpdate({ label: e.target.value })}
                placeholder="Field label"
                className={CLS_INPUT}
              />
            </div>
          </div>

          {!isHeader && (
            <>
              {!isFile && (
                <div>
                  <label className={CLS_LABEL}>Placeholder</label>
                  <input
                    value={field.placeholder || ""}
                    onChange={e => onUpdate({ placeholder: e.target.value })}
                    className={CLS_INPUT}
                  />
                </div>
              )}

              <div>
                <label className={CLS_LABEL}>Help Text</label>
                <input
                  value={field.helpText || ""}
                  onChange={e => onUpdate({ helpText: e.target.value })}
                  placeholder="Shown below the field"
                  className={CLS_INPUT}
                />
              </div>

              {hasOpts && (
                <div>
                  <label className={CLS_LABEL}>Options (one per line)</label>
                  <textarea
                    value={optionsText}
                    onChange={e =>
                      onUpdate({ options: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })
                    }
                    rows={4}
                    placeholder={"Option 1\nOption 2\nOption 3"}
                    className={CLS_INPUT + " resize-none"}
                  />
                </div>
              )}

              {isFile && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={CLS_LABEL}>Accepted File Types</label>
                    <input
                      value={field.acceptedFileTypes || ""}
                      onChange={e => onUpdate({ acceptedFileTypes: e.target.value })}
                      placeholder="image/*,.pdf,.docx"
                      className={CLS_INPUT}
                    />
                    <p className="text-xs text-white/25 mt-1">Comma-separated MIME types or extensions</p>
                  </div>
                  <div>
                    <label className={CLS_LABEL}>Max File Size (MB)</label>
                    <input
                      type="number"
                      value={field.maxFileSizeMb || 10}
                      min={1}
                      max={200}
                      onChange={e => onUpdate({ maxFileSizeMb: Number(e.target.value) })}
                      className={CLS_INPUT}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Toggle
                  value={field.isRequired}
                  onChange={v => onUpdate({ isRequired: v })}
                />
                <span className="text-sm text-white/60">Required</span>
              </div>

              {/* ── Conditional Logic ── */}
              <div className="pt-4 border-t border-white/8 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Conditional Logic</span>
                  <Toggle value={cl.enabled} onChange={v => updateCL({ enabled: v })} />
                </div>

                {cl.enabled && (
                  <div className="bg-white/3 rounded-xl p-3 space-y-3">
                    {/* Sentence-style builder */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <select
                        value={cl.action}
                        onChange={e => updateCL({ action: e.target.value as "show" | "hide" })}
                        className={SEL}
                      >
                        <option value="show">Show</option>
                        <option value="hide">Hide</option>
                      </select>
                      <span className="text-xs text-white/30">this field when</span>
                      <select
                        value={cl.fieldId}
                        onChange={e => updateCL({ fieldId: e.target.value, value: "" })}
                        className={SEL}
                      >
                        <option value="">— choose a field —</option>
                        {triggerCandidates.map(f => (
                          <option key={f.id} value={f.id} className="bg-[#0a0a0a]">
                            {f.label || "Untitled field"}
                          </option>
                        ))}
                      </select>
                      <select
                        value={cl.operator}
                        onChange={e => updateCL({ operator: e.target.value as ConditionalOperator, value: "" })}
                        className={SEL}
                      >
                        <option value="equals">equals</option>
                        <option value="not_equals">doesn&apos;t equal</option>
                        <option value="is_empty">is empty</option>
                        <option value="is_not_empty">is not empty</option>
                      </select>
                      {needsValue && (
                        triggerField?.options?.length ? (
                          <select
                            value={cl.value}
                            onChange={e => updateCL({ value: e.target.value })}
                            className={SEL}
                          >
                            <option value="">— choose —</option>
                            {triggerField.options.map(o => (
                              <option key={o} value={o} className="bg-[#0a0a0a]">{o}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={cl.value}
                            onChange={e => updateCL({ value: e.target.value })}
                            placeholder="value…"
                            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder-white/20 focus:outline-none focus:border-sky-400/50 transition-colors w-28"
                          />
                        )
                      )}
                    </div>

                    {/* Plain-English preview */}
                    {cl.fieldId && (
                      <p className="text-xs text-white/25 italic leading-relaxed">
                        This field will <strong className="text-white/40 not-italic">{cl.action}</strong> when &ldquo;
                        {triggerField?.label || "selected field"}&rdquo;&nbsp;
                        {operatorLabel(cl.operator)}
                        {needsValue && cl.value ? <> &ldquo;<strong className="text-white/40 not-italic">{cl.value}</strong>&rdquo;</> : ""}
                      </p>
                    )}
                    {!cl.fieldId && (
                      <p className="text-xs text-white/20 italic">Choose a field to complete the condition.</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── NotificationsTab ─────────────────────────────────────────────────────────
function NotificationsTab({ formId }: { formId: string }) {
  const [items, setItems] = useState<FormNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`/api/admin/forms/${formId}/notifications`)
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [formId]);

  async function addRecipient() {
    if (!newEmail.trim()) return;
    setAdding(true); setErr("");
    try {
      const res = await fetch(`/api/admin/forms/${formId}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAddress: newEmail.trim(), label: newLabel.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setItems(prev => [...prev, d]);
      setNewEmail(""); setNewLabel("");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setAdding(false);
    }
  }

  async function toggle(n: FormNotification, field: "isActive" | "notifyOnEverySubmission" | "includeFileLinks") {
    const updated = { ...n, [field]: !n[field] };
    setItems(prev => prev.map(i => i._id === n._id ? updated : i));
    await fetch(`/api/admin/forms/${formId}/notifications/${n._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: updated[field] }),
    });
  }

  async function remove(id: string) {
    if (!confirm("Remove this recipient?")) return;
    await fetch(`/api/admin/forms/${formId}/notifications/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i._id !== id));
  }

  async function sendTest(n: FormNotification) {
    setTestingId(n._id); setErr("");
    try {
      const res = await fetch(`/api/admin/forms/${formId}/notifications/${n._id}/test`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to send test");
      alert(`Test email sent to ${n.emailAddress}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error sending test");
    } finally {
      setTestingId(null);
    }
  }

  if (loading) return <div className="text-sm text-white/25 py-4">Loading…</div>;

  return (
    <div className="space-y-6 max-w-xl">
      <p className="text-sm text-white/40">
        These addresses receive an email on every submission. Addresses are never exposed publicly.
      </p>

      {/* Existing recipients */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map(n => (
            <div key={n._id} className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium truncate">{n.emailAddress}</div>
                  {n.label && <div className="text-xs text-white/40">{n.label}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => sendTest(n)}
                    disabled={testingId === n._id}
                    className="text-xs text-sky-400 hover:text-sky-300 transition-colors disabled:opacity-50"
                  >
                    {testingId === n._id ? "Sending…" : "Test"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(n._id)}
                    className="text-xs text-white/25 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
                  <Toggle value={n.isActive} onChange={() => toggle(n, "isActive")} />
                  Active
                </label>
                <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
                  <Toggle value={n.includeFileLinks} onChange={() => toggle(n, "includeFileLinks")} />
                  Include file links
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add recipient */}
      <div className="border border-dashed border-white/10 rounded-xl p-4 space-y-3">
        <p className="text-xs text-white/40 uppercase tracking-widest font-medium">Add Recipient</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={CLS_LABEL}>Email Address</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="you@example.com"
              className={CLS_INPUT}
            />
          </div>
          <div>
            <label className={CLS_LABEL}>Label (optional)</label>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Owner, Sales Team…"
              className={CLS_INPUT}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={addRecipient}
          disabled={adding || !newEmail.trim()}
          className={CLS_BTN_PRIMARY}
        >
          {adding ? "Adding…" : "Add Recipient"}
        </button>
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}

// ─── FormBuilderClient (main export) ─────────────────────────────────────────
export default function FormBuilderClient({ initial }: { initial: Cel3Form }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("fields");
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description || "");
  const [slug, setSlug] = useState(initial.slug);
  const [isPublic, setIsPublic] = useState(initial.isPublic);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [fields, setFields] = useState<FormField[]>(
    (initial.fields || []).slice().sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [slugManual, setSlugManual] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  function handleTitle(v: string) {
    setTitle(v);
    if (!slugManual) setSlug(slugify(v));
  }

  function addField(type: FieldType) {
    const f = makeField(fields.length);
    f.fieldType = type;
    setFields(prev => [...prev, f]);
    setExpandedId(f.id);
    setShowAddMenu(false);
  }

  function updateField(id: string, updates: Partial<FormField>) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }

  function removeField(id: string) {
    setFields(prev => prev.filter(f => f.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function moveField(id: string, dir: -1 | 1) {
    setFields(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr.map((f, i) => ({ ...f, sortOrder: i }));
    });
  }

  async function handleSave() {
    if (!title.trim()) { setSaveError("Title is required"); return; }
    if (!slug.trim()) { setSaveError("Slug is required"); return; }
    setSaving(true); setSaveError(""); setSaved(false);
    try {
      const res = await fetch(`/api/admin/forms/${initial._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, slug, isPublic, isActive,
          fields: fields.map((f, i) => ({ ...f, sortOrder: i })),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${title}"?\n\nThis will permanently remove the form and all its submissions.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/forms/${initial._id}`, { method: "DELETE" });
      router.push("/admin/forms");
      router.refresh();
    } catch {
      setSaveError("Delete failed");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <input
            value={title}
            onChange={e => handleTitle(e.target.value)}
            placeholder="Form Title"
            className="w-full bg-transparent text-2xl font-semibold text-white placeholder-white/25 focus:outline-none border-b border-transparent focus:border-white/20 pb-1 transition-colors"
          />
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-transparent text-sm text-white/40 placeholder-white/20 focus:outline-none mt-1"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/forms/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={CLS_BTN_SEC}
          >
            Preview
          </a>
          <button onClick={handleSave} disabled={saving} className={CLS_BTN_PRIMARY}>
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/8">
        {(["fields", "settings", "notifications"] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-sky-400 text-sky-400"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Fields Tab ── */}
      {tab === "fields" && (
        <div className="space-y-2">
          {fields.length === 0 && (
            <div className="text-center py-12 text-white/25 text-sm border border-dashed border-white/10 rounded-2xl">
              No fields yet. Click &ldquo;Add Field&rdquo; below.
            </div>
          )}

          {fields.map((field, idx) => (
            <FieldCard
              key={field.id}
              field={field}
              allFields={fields}
              expanded={expandedId === field.id}
              onToggle={() => setExpandedId(expandedId === field.id ? null : field.id)}
              onUpdate={u => updateField(field.id, u)}
              onRemove={() => removeField(field.id)}
              onMoveUp={idx > 0 ? () => moveField(field.id, -1) : undefined}
              onMoveDown={idx < fields.length - 1 ? () => moveField(field.id, 1) : undefined}
            />
          ))}

          {/* Add Field */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAddMenu(v => !v)}
              className="w-full py-3 rounded-xl border border-dashed border-white/15 hover:border-sky-400/40 text-white/40 hover:text-sky-400 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Field
            </button>

            {showAddMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f1117] border border-white/15 rounded-xl overflow-hidden z-20 shadow-2xl grid grid-cols-3">
                  {ALL_FIELD_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => addField(t)}
                      className="px-4 py-3 text-left text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      {FIELD_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Settings Tab ── */}
      {tab === "settings" && (
        <div className="space-y-5 max-w-lg">
          <div>
            <label className={CLS_LABEL}>Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-sm shrink-0">/forms/</span>
              <input
                value={slug}
                onChange={e => { setSlug(e.target.value); setSlugManual(true); }}
                placeholder="form-slug"
                className={CLS_INPUT}
              />
            </div>
            <p className="text-xs text-white/25 mt-1">
              Public URL: {typeof window !== "undefined" ? window.location.origin : ""}/forms/{slug}
            </p>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-white/8">
            <div>
              <div className="text-sm text-white">Public</div>
              <div className="text-xs text-white/30">Allow anyone with the link to view and submit this form</div>
            </div>
            <Toggle value={isPublic} onChange={setIsPublic} />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-white/8">
            <div>
              <div className="text-sm text-white">Active</div>
              <div className="text-xs text-white/30">Accept new submissions</div>
            </div>
            <Toggle value={isActive} onChange={setIsActive} />
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className={CLS_BTN_DANGER}
            >
              {deleting ? "Deleting…" : "Delete Form"}
            </button>
            <p className="text-xs text-white/25 mt-1">Permanently deletes this form and all submissions.</p>
          </div>
        </div>
      )}

      {/* ── Notifications Tab ── */}
      {tab === "notifications" && <NotificationsTab formId={initial._id} />}

      {saveError && <p className="text-sm text-red-400">{saveError}</p>}
    </div>
  );
}
