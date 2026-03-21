"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Contact } from "@/lib/google/contacts";

const AVATAR_COLORS = [
  "bg-sky-500/30 text-sky-300",
  "bg-emerald-500/30 text-emerald-300",
  "bg-violet-500/30 text-violet-300",
  "bg-amber-500/30 text-amber-300",
  "bg-pink-500/30 text-pink-300",
  "bg-teal-500/30 text-teal-300",
];

function AvatarCircle({ name, index }: { name: string | null; index: number }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${color}`}>
      {initial}
    </div>
  );
}

// ─── Contact Form ─────────────────────────────────────────────────────────────

interface ContactFormData {
  givenName: string;
  familyName: string;
  emails: string[];
  phones: string[];
  organization: string;
  notes: string;
  birthday: string;
}

function emptyFormData(): ContactFormData {
  return { givenName: "", familyName: "", emails: [""], phones: [""], organization: "", notes: "", birthday: "" };
}

function contactToFormData(c: Contact): ContactFormData {
  return {
    givenName: c.givenName ?? "",
    familyName: c.familyName ?? "",
    emails: c.emails.map((e) => e.value).concat([""] as string[]).slice(0, Math.max(c.emails.length + 1, 1)),
    phones: c.phones.map((p) => p.value).concat([""] as string[]).slice(0, Math.max(c.phones.length + 1, 1)),
    organization: c.organizations[0]?.name ?? "",
    notes: c.notes ?? "",
    birthday: c.birthday ?? "",
  };
}

interface ContactFormProps {
  initialData?: ContactFormData;
  onSubmit: (data: ContactFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  loading: boolean;
  error: string | null;
}

function ContactForm({ initialData, onSubmit, onCancel, submitLabel, loading, error }: ContactFormProps) {
  const [form, setForm] = useState<ContactFormData>(initialData ?? emptyFormData());

  function setField<K extends keyof ContactFormData>(key: K, value: ContactFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setMultiField(key: "emails" | "phones", index: number, value: string) {
    setForm((prev) => {
      const arr = [...prev[key]];
      arr[index] = value;
      // Add empty entry if last non-empty
      if (index === arr.length - 1 && value !== "") arr.push("");
      return { ...prev, [key]: arr };
    });
  }

  function removeMultiField(key: "emails" | "phones", index: number) {
    setForm((prev) => {
      const arr = prev[key].filter((_, i) => i !== index);
      if (arr.length === 0) arr.push("");
      return { ...prev, [key]: arr };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/40 block mb-1">First name</label>
          <input
            type="text"
            value={form.givenName}
            onChange={(e) => setField("givenName", e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50"
          />
        </div>
        <div>
          <label className="text-xs text-white/40 block mb-1">Last name</label>
          <input
            type="text"
            value={form.familyName}
            onChange={(e) => setField("familyName", e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-white/40 block mb-1">Email(s)</label>
        {form.emails.map((email, i) => (
          <div key={i} className="flex gap-2 mb-1.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setMultiField("emails", i, e.target.value)}
              placeholder="email@example.com"
              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50"
            />
            {form.emails.length > 1 && (
              <button
                type="button"
                onClick={() => removeMultiField("emails", i)}
                className="text-white/30 hover:text-red-400 transition-colors"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs text-white/40 block mb-1">Phone(s)</label>
        {form.phones.map((phone, i) => (
          <div key={i} className="flex gap-2 mb-1.5">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setMultiField("phones", i, e.target.value)}
              placeholder="+1 555 000 0000"
              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50"
            />
            {form.phones.length > 1 && (
              <button
                type="button"
                onClick={() => removeMultiField("phones", i)}
                className="text-white/30 hover:text-red-400 transition-colors"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs text-white/40 block mb-1">Organization</label>
        <input
          type="text"
          value={form.organization}
          onChange={(e) => setField("organization", e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50"
        />
      </div>

      <div>
        <label className="text-xs text-white/40 block mb-1">Birthday (YYYY-MM-DD)</label>
        <input
          type="text"
          value={form.birthday}
          onChange={(e) => setField("birthday", e.target.value)}
          placeholder="1990-01-15"
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50"
        />
      </div>

      <div>
        <label className="text-xs text-white/40 block mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50 resize-none"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white bg-white/5 hover:bg-white/8 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── Contact Detail Panel ─────────────────────────────────────────────────────

interface DetailPanelProps {
  contact: Contact;
  onClose: () => void;
  onUpdate: (c: Contact) => void;
  onDelete: (id: string) => void;
}

function DetailPanel({ contact, onClose, onUpdate, onDelete }: DetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const id = contact.resourceName.replace("people/", "");

  const handleUpdate = async (form: ContactFormData) => {
    setSaving(true);
    setSaveError(null);
    try {
      // First get current etag
      const getRes = await fetch(`/api/admin/contacts/${id}`);
      if (!getRes.ok) throw new Error("Failed to fetch contact for update");
      const current = await getRes.json() as Contact & { etag?: string };

      // We need the raw etag — fetch it from the People API via our GET endpoint
      // The contact returned from API doesn't include etag, so we need to get it
      // Use a workaround: PUT with empty etag will fail, but that's the API contract
      const emails = form.emails.filter(Boolean).map((v) => ({ value: v }));
      const phones = form.phones.filter(Boolean).map((v) => ({ value: v }));

      const putRes = await fetch(`/api/admin/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          etag: (current as Record<string, unknown>).etag ?? "*",
          givenName: form.givenName || undefined,
          familyName: form.familyName || undefined,
          emails: emails.length ? emails : undefined,
          phones: phones.length ? phones : undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to update contact");
      }
      const updated = await putRes.json() as Contact;
      onUpdate(updated);
      setEditing(false);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete contact");
      onDelete(contact.resourceName);
    } catch (e) {
      setSaveError((e as Error).message);
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
          <h3 className="text-sm font-semibold text-white">Edit Contact</h3>
          <button onClick={() => setEditing(false)} className="text-white/40 hover:text-white">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <ContactForm
            initialData={contactToFormData(contact)}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
            submitLabel="Save"
            loading={saving}
            error={saveError}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
        <h3 className="text-sm font-semibold text-white">Contact</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center gap-4 mb-5">
          <AvatarCircle name={contact.displayName} index={0} />
          <div>
            <p className="text-lg font-semibold text-white">
              {contact.displayName ?? "Unknown"}
            </p>
            {contact.organizations[0]?.title && (
              <p className="text-xs text-white/40">{contact.organizations[0].title}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {contact.emails.length > 0 && (
            <div>
              <p className="text-xs text-white/30 mb-1">Email</p>
              {contact.emails.map((e, i) => (
                <a key={i} href={`mailto:${e.value}`} className="block text-sm text-sky-400 hover:text-sky-300">
                  {e.value}{e.type ? ` (${e.type})` : ""}
                </a>
              ))}
            </div>
          )}
          {contact.phones.length > 0 && (
            <div>
              <p className="text-xs text-white/30 mb-1">Phone</p>
              {contact.phones.map((p, i) => (
                <a key={i} href={`tel:${p.value}`} className="block text-sm text-white/70 hover:text-white">
                  {p.value}{p.type ? ` (${p.type})` : ""}
                </a>
              ))}
            </div>
          )}
          {contact.organizations.length > 0 && (
            <div>
              <p className="text-xs text-white/30 mb-1">Organization</p>
              {contact.organizations.map((o, i) => (
                <p key={i} className="text-sm text-white/70">
                  {o.name}{o.title ? ` — ${o.title}` : ""}
                </p>
              ))}
            </div>
          )}
          {contact.addresses.length > 0 && (
            <div>
              <p className="text-xs text-white/30 mb-1">Address</p>
              {contact.addresses.map((a, i) => (
                <p key={i} className="text-sm text-white/70">
                  {a.formattedValue ?? [a.city, a.country].filter(Boolean).join(", ")}
                </p>
              ))}
            </div>
          )}
          {contact.birthday && (
            <div>
              <p className="text-xs text-white/30 mb-1">Birthday</p>
              <p className="text-sm text-white/70">{contact.birthday}</p>
            </div>
          )}
          {contact.notes && (
            <div>
              <p className="text-xs text-white/30 mb-1">Notes</p>
              <p className="text-sm text-white/60 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}
        </div>

        {saveError && (
          <div className="mt-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
            {saveError}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-5 py-4 border-t border-white/8 flex gap-2">
        <button
          onClick={() => setEditing(true)}
          className="flex-1 px-3 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 transition-colors"
        >
          Edit
        </button>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-3 py-2 rounded-xl text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
          >
            Delete
          </button>
        ) : (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-2 rounded-xl text-sm text-white bg-red-500 hover:bg-red-400 disabled:opacity-50 transition-colors"
          >
            {deleting ? "Deleting…" : "Confirm"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContactsClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchContacts = useCallback(async (token?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (token) params.set("pageToken", token);
      const res = await fetch(`/api/admin/contacts?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to load contacts");
      }
      const data = await res.json();
      setContacts(token ? (prev) => [...prev, ...(data.contacts ?? [])] : (data.contacts ?? []));
      setNextPageToken(data.nextPageToken ?? undefined);
      setTotalItems(data.totalItems ?? 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) {
      fetchContacts();
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/contacts?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setContacts(data.contacts ?? []);
        setTotalItems(data.totalItems ?? 0);
        setNextPageToken(undefined);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [fetchContacts]);

  const handleCreate = async (form: ContactFormData) => {
    setCreating(true);
    setCreateError(null);
    try {
      const emails = form.emails.filter(Boolean);
      const phones = form.phones.filter(Boolean);
      const res = await fetch("/api/admin/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          givenName: form.givenName || undefined,
          familyName: form.familyName || undefined,
          emails: emails.length ? emails : undefined,
          phones: phones.length ? phones : undefined,
          organization: form.organization || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to create contact");
      }
      const contact = await res.json() as Contact;
      setContacts((prev) => [contact, ...prev]);
      setTotalItems((prev) => prev + 1);
      setShowNewModal(false);
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = (updated: Contact) => {
    setContacts((prev) => prev.map((c) => c.resourceName === updated.resourceName ? updated : c));
    setSelected(updated);
  };

  const handleDelete = (resourceName: string) => {
    setContacts((prev) => prev.filter((c) => c.resourceName !== resourceName));
    setTotalItems((prev) => Math.max(prev - 1, 0));
    setSelected(null);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Main panel */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-white">Contacts</h1>
            <p className="text-sm text-white/40 mt-1">{totalItems} contact{totalItems !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Contact
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg
            width="14" height="14"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
            fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search contacts…"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50"
          />
          {searchLoading && (
            <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-white/30" width="14" height="14" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs space-y-1">
            <div>{error}</div>
            {(error.toLowerCase().includes("scope") || error.toLowerCase().includes("insufficient") || error.toLowerCase().includes("auth") || error.includes("403")) && (
              <div className="text-white/50">
                Your Google account needs to be reconnected to grant the Contacts permission.{" "}
                <a href="/admin/email" className="text-sky-400 hover:text-sky-300 underline">
                  Reconnect Google →
                </a>
              </div>
            )}
          </div>
        )}

        {/* Contact list */}
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          {loading && contacts.length === 0 ? (
            <div className="p-4 space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-white/5 rounded animate-pulse w-32" />
                    <div className="h-3 bg-white/5 rounded animate-pulse w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-12 text-center text-white/30 text-sm">
              {search ? "No contacts found" : "No contacts yet"}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {contacts.map((contact, index) => (
                <button
                  key={contact.resourceName}
                  onClick={() => setSelected(contact)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/3 ${selected?.resourceName === contact.resourceName ? "bg-sky-500/5" : ""}`}
                >
                  <AvatarCircle name={contact.displayName} index={index} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {contact.displayName ?? "Unknown"}
                    </p>
                    {contact.emails[0] && (
                      <p className="text-xs text-white/40 truncate">{contact.emails[0].value}</p>
                    )}
                    {contact.phones[0] && !contact.emails[0] && (
                      <p className="text-xs text-white/40 truncate">{contact.phones[0].value}</p>
                    )}
                  </div>
                  {contact.organizations[0]?.name && (
                    <span className="text-xs text-white/30 flex-shrink-0 hidden sm:block truncate max-w-[120px]">
                      {contact.organizations[0].name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {nextPageToken && !search && (
            <div className="px-4 py-3 border-t border-white/8 text-center">
              <button
                onClick={() => fetchContacts(nextPageToken)}
                disabled={loading}
                className="text-xs text-white/40 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/8 transition-colors disabled:opacity-50"
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 bg-white/3 border border-white/8 rounded-2xl overflow-hidden flex flex-col">
          <DetailPanel
            contact={selected}
            onClose={() => setSelected(null)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* New contact modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">New Contact</h3>
              <button onClick={() => setShowNewModal(false)} className="text-white/40 hover:text-white">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ContactForm
              onSubmit={handleCreate}
              onCancel={() => setShowNewModal(false)}
              submitLabel="Create"
              loading={creating}
              error={createError}
            />
          </div>
        </div>
      )}
    </div>
  );
}
