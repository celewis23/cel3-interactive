"use client";
import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "draft" | "scheduled" | "sending" | "sent" | "failed";
type TargetType = "all" | "portal_users" | "subscribers" | "group";

interface Campaign {
  id: string; title: string; subject: string; bodyHtml: string;
  status: Status; targetType: TargetType; groupId: string | null;
  scheduledAt: string | null; sentAt: string | null; createdAt: string;
  sentCount: number; openCount: number; clickCount: number;
}
interface Subscriber { id: string; email: string; name: string | null; status: "active" | "unsubscribed"; createdAt: string; }
interface Group { id: string; name: string; description: string | null; memberCount?: number; }
interface GroupMember { groupId: string; memberType: "portal_user" | "subscriber"; memberId: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusStyle(s: Status) {
  const m: Record<Status, string> = {
    draft: "bg-white/8 text-white/50",
    scheduled: "bg-violet-500/15 text-violet-300",
    sending: "bg-sky-500/15 text-sky-300",
    sent: "bg-emerald-500/15 text-emerald-300",
    failed: "bg-red-500/15 text-red-300",
  };
  return m[s] ?? m.draft;
}

const TARGET_LABELS: Record<TargetType, string> = {
  all: "Everyone (portal users + subscribers)",
  portal_users: "Portal users only",
  subscribers: "Subscribers only",
  group: "Specific group",
};

// ─── Rich text editor ─────────────────────────────────────────────────────────

function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    if (ref.current && !isMounted.current) {
      ref.current.innerHTML = value;
      isMounted.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset editor when value cleared externally (new campaign)
  useEffect(() => {
    if (ref.current && value === "" && ref.current.innerHTML !== "") {
      ref.current.innerHTML = "";
    }
  }, [value]);

  function cmd(command: string, val?: string) {
    document.execCommand(command, false, val);
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
  }

  function insertLink() {
    const sel = window.getSelection()?.toString();
    const url = window.prompt("Enter URL:", "https://");
    if (url) cmd("createLink", url);
    else if (sel) cmd("unlink");
  }

  function insertImage() {
    const url = window.prompt("Image URL:", "https://");
    if (url) cmd("insertImage", url);
  }

  const btnCls = "px-2 py-1 rounded text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors select-none";

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 px-2 py-1.5 border-b border-white/8 bg-white/3">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("bold"); }} className={`${btnCls} font-bold`}>B</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("italic"); }} className={`${btnCls} italic`}>I</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("underline"); }} className={`${btnCls} underline`}>U</button>
        <div className="w-px h-5 bg-white/10 self-center mx-1" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("formatBlock", "h2"); }} className={btnCls}>H2</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("formatBlock", "h3"); }} className={btnCls}>H3</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("formatBlock", "p"); }} className={btnCls}>¶</button>
        <div className="w-px h-5 bg-white/10 self-center mx-1" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("insertUnorderedList"); }} className={btnCls}>• List</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("insertOrderedList"); }} className={btnCls}>1. List</button>
        <div className="w-px h-5 bg-white/10 self-center mx-1" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertLink(); }} className={btnCls}>Link</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertImage(); }} className={btnCls}>Image</button>
        <div className="w-px h-5 bg-white/10 self-center mx-1" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("removeFormat"); }} className={btnCls}>Clear</button>
      </div>
      {/* Editable area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (ref.current) onChange(ref.current.innerHTML); }}
        className="min-h-[280px] p-4 text-sm text-white/85 leading-relaxed outline-none
          [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-4 [&_h2]:mb-2
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-3 [&_h3]:mb-1
          [&_a]:text-sky-400 [&_a]:underline
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
          [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2"
      />
    </div>
  );
}

// ─── Campaign panel ───────────────────────────────────────────────────────────

function CampaignPanel({
  campaign, groups, onSaved, onDeleted, isCreating,
}: {
  campaign: Campaign | null;
  groups: Group[];
  onSaved: (c: Campaign) => void;
  onDeleted: (id: string) => void;
  isCreating: boolean;
}) {
  const [title, setTitle] = useState(campaign?.title ?? "");
  const [subject, setSubject] = useState(campaign?.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(campaign?.bodyHtml ?? "");
  const [targetType, setTargetType] = useState<TargetType>(campaign?.targetType ?? "all");
  const [groupId, setGroupId] = useState(campaign?.groupId ?? "");
  const [scheduleDate, setScheduleDate] = useState(campaign?.scheduledAt ? campaign.scheduledAt.slice(0, 16) : "");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setTitle(campaign?.title ?? "");
    setSubject(campaign?.subject ?? "");
    setBodyHtml(campaign?.bodyHtml ?? "");
    setTargetType(campaign?.targetType ?? "all");
    setGroupId(campaign?.groupId ?? "");
    setScheduleDate(campaign?.scheduledAt ? campaign.scheduledAt.slice(0, 16) : "");
    setErr("");
    setConfirm(false);
  }, [campaign?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSent = campaign?.status === "sent";
  const isSending = campaign?.status === "sending";

  async function save(andSchedule = false) {
    setErr("");
    if (!title.trim() || !subject.trim()) { setErr("Title and subject are required."); return; }
    setSaving(true);
    try {
      const payload = {
        title, subject, bodyHtml, targetType,
        groupId: targetType === "group" ? groupId : null,
        scheduledAt: andSchedule && scheduleDate ? new Date(scheduleDate).toISOString() : null,
      };
      let res: Response;
      if (campaign) {
        res = await fetch(`/api/admin/campaigns/${campaign.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        res = await fetch("/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Save failed"); return; }
      onSaved(data.campaign);
    } finally {
      setSaving(false);
    }
  }

  async function sendNow() {
    if (!campaign) return;
    setSending(true);
    setConfirm(false);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Send failed"); return; }
      onSaved(data.campaign);
    } finally {
      setSending(false);
    }
  }

  async function deleteCampaign() {
    if (!campaign) return;
    if (!window.confirm("Delete this campaign?")) return;
    await fetch(`/api/admin/campaigns/${campaign.id}`, { method: "DELETE" });
    onDeleted(campaign.id);
  }

  if (!campaign && !isCreating) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/25 text-sm">
        Select a campaign or create a new one
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
      {/* Status banner */}
      {campaign && (
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusStyle(campaign.status)}`}>
            {campaign.status}
          </span>
          {isSent && (
            <div className="flex items-center gap-4 text-xs text-white/40">
              <span>{campaign.sentCount} sent</span>
              <span>{campaign.openCount} opens ({campaign.sentCount > 0 ? Math.round((campaign.openCount / campaign.sentCount) * 100) : 0}%)</span>
              <span>{campaign.clickCount} clicks</span>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-white/40 mb-1">Campaign title (internal)</label>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            disabled={isSent || isSending}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 disabled:opacity-50"
            placeholder="e.g. June Newsletter"
          />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1">Email subject line</label>
          <input
            value={subject} onChange={(e) => setSubject(e.target.value)}
            disabled={isSent || isSending}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 disabled:opacity-50"
            placeholder="What your recipients will see in their inbox"
          />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-2">Content</label>
          {isSent || isSending ? (
            <div
              className="min-h-[200px] p-4 border border-white/8 rounded-xl text-sm text-white/70 leading-relaxed [&_a]:text-sky-400 [&_ul]:list-disc [&_ul]:pl-5 [&_img]:max-w-full"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : (
            <RichEditor value={bodyHtml} onChange={setBodyHtml} />
          )}
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1">Send to</label>
          <select
            value={targetType} onChange={(e) => setTargetType(e.target.value as TargetType)}
            disabled={isSent || isSending}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 disabled:opacity-50"
          >
            {(Object.entries(TARGET_LABELS) as [TargetType, string][]).map(([v, l]) => (
              <option key={v} value={v} className="bg-[#111]">{l}</option>
            ))}
          </select>
          {targetType === "group" && (
            <select
              value={groupId} onChange={(e) => setGroupId(e.target.value)}
              disabled={isSent || isSending}
              className="mt-2 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 disabled:opacity-50"
            >
              <option value="" className="bg-[#111]">— Select a group —</option>
              {groups.map((g) => <option key={g.id} value={g.id} className="bg-[#111]">{g.name} ({g.memberCount ?? 0} members)</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Error */}
      {err && <p className="text-xs text-red-400">{err}</p>}

      {/* Actions */}
      {!isSent && !isSending && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/8">
          <button onClick={() => save()} disabled={saving} className="px-4 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500/50"
            />
            <button
              onClick={() => save(true)}
              disabled={saving || !scheduleDate}
              className="px-4 py-2 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Schedule
            </button>
          </div>
          {campaign && (
            confirm ? (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-white/50">Send to {TARGET_LABELS[targetType]}?</span>
                <button onClick={sendNow} disabled={sending} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-colors disabled:opacity-50">
                  {sending ? "Sending…" : "Confirm Send"}
                </button>
                <button onClick={() => setConfirm(false)} className="px-3 py-2 text-xs text-white/40 hover:text-white">Cancel</button>
              </div>
            ) : (
              <button onClick={() => { save(); setConfirm(true); }} className="ml-auto px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-black text-sm font-semibold transition-colors">
                Send Now →
              </button>
            )
          )}
          {campaign && (
            <button onClick={deleteCampaign} className="px-3 py-2 text-xs text-red-400/60 hover:text-red-400 transition-colors ml-1">
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [tab, setTab] = useState<"campaigns" | "subscribers" | "groups">("campaigns");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [loading, setLoading] = useState(true);

  // Subscriber add form
  const [subEmail, setSubEmail] = useState("");
  const [subName, setSubName] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [subSaving, setSubSaving] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  // Group form
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupSaving, setGroupSaving] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [portalUsers, setPortalUsers] = useState<{ _id: string; email: string; name: string | null }[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes, gRes] = await Promise.all([
        fetch("/api/admin/campaigns"),
        fetch("/api/admin/subscribers"),
        fetch("/api/admin/groups"),
      ]);
      const [cData, sData, gData] = await Promise.all([cRes.json(), sRes.json(), gRes.json()]);
      setCampaigns(cData.campaigns ?? []);
      setSubscribers(sData.subscribers ?? []);
      setGroups(gData.groups ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load portal users for contact picker + group member picker
  useEffect(() => {
    if (tab === "groups" || tab === "subscribers") {
      fetch("/api/admin/portal-users").then((r) => r.json()).then((d) => {
        // portal-users route returns the array directly (not wrapped)
        const arr = Array.isArray(d) ? d : (d.users ?? []);
        setPortalUsers(arr);
      }).catch(() => {});
    }
  }, [tab]);

  async function loadGroupMembers(groupId: string) {
    const res = await fetch(`/api/admin/groups/${groupId}`);
    const data = await res.json();
    setGroupMembers(data.members ?? []);
  }

  async function addSubscriber() {
    if (bulkMode) {
      const emails = bulkEmails.split(/[\n,;]+/).map((e) => e.trim()).filter((e) => e.includes("@"));
      if (!emails.length) return;
      setSubSaving(true);
      await fetch("/api/admin/subscribers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emails }) });
      setBulkEmails("");
      setBulkMode(false);
    } else {
      if (!subEmail.includes("@")) return;
      setSubSaving(true);
      await fetch("/api/admin/subscribers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: subEmail, name: subName || null }) });
      setSubEmail(""); setSubName("");
    }
    setSubSaving(false);
    const res = await fetch("/api/admin/subscribers");
    const data = await res.json();
    setSubscribers(data.subscribers ?? []);
  }

  async function addContactAsSubscriber(email: string, name: string | null) {
    setSubSaving(true);
    await fetch("/api/admin/subscribers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name }) });
    setSubSaving(false);
    const res = await fetch("/api/admin/subscribers");
    const data = await res.json();
    setSubscribers(data.subscribers ?? []);
  }

  async function toggleSubscriber(id: string, current: "active" | "unsubscribed") {
    await fetch(`/api/admin/subscribers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: current === "active" ? "unsubscribed" : "active" }) });
    setSubscribers((prev) => prev.map((s) => s.id === id ? { ...s, status: current === "active" ? "unsubscribed" : "active" } : s));
  }

  async function removeSubscriber(id: string) {
    if (!window.confirm("Remove subscriber?")) return;
    await fetch(`/api/admin/subscribers/${id}`, { method: "DELETE" });
    setSubscribers((prev) => prev.filter((s) => s.id !== id));
  }

  async function addGroup() {
    if (!groupName.trim()) return;
    setGroupSaving(true);
    const res = await fetch("/api/admin/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: groupName, description: groupDesc || null }) });
    const data = await res.json();
    setGroups((prev) => [data.group, ...prev]);
    setGroupName(""); setGroupDesc("");
    setGroupSaving(false);
  }

  async function deleteGroup(id: string) {
    if (!window.confirm("Delete group?")) return;
    await fetch(`/api/admin/groups/${id}`, { method: "DELETE" });
    setGroups((prev) => prev.filter((g) => g.id !== id));
    if (selectedGroup?.id === id) { setSelectedGroup(null); setGroupMembers([]); }
  }

  async function addMember(groupId: string, type: "portal_user" | "subscriber", memberId: string) {
    await fetch(`/api/admin/groups/${groupId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_member", memberType: type, memberId }) });
    await loadGroupMembers(groupId);
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, memberCount: (g.memberCount ?? 0) + 1 } : g));
  }

  async function removeMember(groupId: string, type: string, memberId: string) {
    await fetch(`/api/admin/groups/${groupId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove_member", memberType: type, memberId }) });
    setGroupMembers((prev) => prev.filter((m) => !(m.memberId === memberId && m.memberType === type)));
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, memberCount: Math.max((g.memberCount ?? 1) - 1, 0) } : g));
  }

  const rowCls = "flex items-center justify-between px-4 py-3 border border-white/8 bg-white/3 rounded-xl hover:border-white/15 transition-colors";
  const inputCls = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50";
  const btnPrimary = "px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-black text-sm font-semibold transition-colors disabled:opacity-50";
  const btnGhost = "px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/8 transition-colors";

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Header + tabs */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Campaigns</h1>
          <p className="text-sm text-white/40 mt-0.5">Newsletters and marketing emails</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-white/8 pb-0">
        {(["campaigns", "subscribers", "groups"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? "border-sky-400 text-sky-400" : "border-transparent text-white/45 hover:text-white"}`}
          >
            {t === "subscribers" ? `Subscribers (${subscribers.length})` : t === "groups" ? `Groups (${groups.length})` : `Campaigns (${campaigns.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-white/30 text-sm">Loading…</div>
      ) : (
        <>
          {/* ── Campaigns tab ── */}
          {tab === "campaigns" && (
            <div className="flex gap-6 min-h-0 flex-1">
              {/* Left list */}
              <div className="w-72 flex-shrink-0 flex flex-col gap-2 overflow-y-auto">
                <button
                  onClick={() => { setSelectedCampaign(null); setCreatingNew(true); }}
                  className={`${rowCls} text-sky-400 border-sky-500/20 hover:border-sky-500/40`}
                >
                  <span className="text-sm font-medium">+ New Campaign</span>
                </button>
                {campaigns.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCampaign(c); setCreatingNew(false); }}
                    className={`${rowCls} flex-col items-start gap-1 cursor-pointer ${selectedCampaign?.id === c.id ? "border-sky-500/40 bg-sky-500/5" : ""}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm text-white truncate max-w-[160px]">{c.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusStyle(c.status)}`}>{c.status}</span>
                    </div>
                    <span className="text-xs text-white/35">{c.subject}</span>
                    <span className="text-xs text-white/25">{c.status === "sent" ? `Sent ${fmtDate(c.sentAt)} · ${c.sentCount} recipients` : c.scheduledAt ? `Scheduled ${fmtDate(c.scheduledAt)}` : `Created ${fmtDate(c.createdAt)}`}</span>
                  </button>
                ))}
                {campaigns.length === 0 && (
                  <p className="text-xs text-white/25 px-2">No campaigns yet.</p>
                )}
              </div>

              {/* Right panel */}
              <div className="flex-1 border border-white/8 rounded-2xl overflow-hidden flex flex-col">
                <CampaignPanel
                  campaign={creatingNew ? null : selectedCampaign}
                  isCreating={creatingNew}
                  groups={groups}
                  onSaved={(c) => {
                    setCampaigns((prev) => {
                      const idx = prev.findIndex((x) => x.id === c.id);
                      return idx >= 0 ? prev.map((x) => x.id === c.id ? c : x) : [c, ...prev];
                    });
                    setSelectedCampaign(c);
                    setCreatingNew(false);
                  }}
                  onDeleted={(id) => {
                    setCampaigns((prev) => prev.filter((c) => c.id !== id));
                    setSelectedCampaign(null);
                    setCreatingNew(false);
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Subscribers tab ── */}
          {tab === "subscribers" && (
            <div className="flex flex-col gap-4 max-w-2xl">
              {/* Add form */}
              <div className="border border-white/8 bg-white/3 rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Add Subscribers</span>
                  <button onClick={() => setBulkMode((v) => !v)} className={btnGhost}>
                    {bulkMode ? "Single entry" : "Bulk import"}
                  </button>
                </div>
                {bulkMode ? (
                  <>
                    <textarea
                      value={bulkEmails} onChange={(e) => setBulkEmails(e.target.value)}
                      placeholder="One email per line, or comma-separated"
                      rows={4}
                      className={`${inputCls} w-full resize-none`}
                    />
                    <button onClick={addSubscriber} disabled={subSaving || !bulkEmails.trim()} className={btnPrimary}>
                      {subSaving ? "Importing…" : "Import"}
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <input value={subEmail} onChange={(e) => setSubEmail(e.target.value)} placeholder="email@example.com" className={`${inputCls} flex-1`} />
                    <input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Name (optional)" className={`${inputCls} w-40`} />
                    <button onClick={addSubscriber} disabled={subSaving || !subEmail.includes("@")} className={btnPrimary}>
                      {subSaving ? "Adding…" : "Add"}
                    </button>
                  </div>
                )}
              </div>

              {/* Contact picker */}
              <div className="border border-white/8 bg-white/3 rounded-2xl overflow-hidden">
                <button
                  onClick={() => { setShowContactPicker((v) => !v); setContactSearch(""); }}
                  className="w-full flex items-center justify-between px-5 py-3 text-sm text-white/70 hover:text-white transition-colors"
                >
                  <span className="font-medium">Add from portal contacts</span>
                  <span className="text-white/30 text-xs">{showContactPicker ? "▲ Hide" : `${portalUsers.filter((u) => !subscribers.some((s) => s.email === u.email)).length} available ▼`}</span>
                </button>
                {showContactPicker && (
                  <div className="border-t border-white/8 px-4 pb-4 flex flex-col gap-2">
                    <input
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Search by name or email…"
                      className="mt-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 w-full"
                      autoFocus
                    />
                    <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto mt-1">
                      {portalUsers
                        .filter((u) => {
                          if (subscribers.some((s) => s.email === u.email)) return false;
                          if (!contactSearch.trim()) return true;
                          const q = contactSearch.toLowerCase();
                          return u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q);
                        })
                        .map((u) => (
                          <button
                            key={u._id}
                            onClick={() => addContactAsSubscriber(u.email, u.name ?? null)}
                            disabled={subSaving}
                            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/8 transition-colors group text-left disabled:opacity-50"
                          >
                            <div>
                              <p className="text-sm text-white">{u.email}</p>
                              {u.name && <p className="text-xs text-white/40">{u.name}</p>}
                            </div>
                            <span className="text-xs text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">Add →</span>
                          </button>
                        ))}
                      {portalUsers.filter((u) => {
                        if (subscribers.some((s) => s.email === u.email)) return false;
                        if (!contactSearch.trim()) return true;
                        const q = contactSearch.toLowerCase();
                        return u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q);
                      }).length === 0 && (
                        <p className="text-xs text-white/25 px-3 py-2">
                          {contactSearch ? "No matching contacts." : "All portal contacts are already subscribed."}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* List */}
              <div className="flex flex-col gap-2">
                {subscribers.length === 0 && <p className="text-sm text-white/30 px-2">No subscribers yet.</p>}
                {subscribers.map((s) => (
                  <div key={s.id} className={`${rowCls} gap-3`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{s.email}</p>
                      {s.name && <p className="text-xs text-white/40">{s.name}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/8 text-white/40"}`}>
                      {s.status}
                    </span>
                    <button onClick={() => toggleSubscriber(s.id, s.status)} className={btnGhost}>
                      {s.status === "active" ? "Unsubscribe" : "Reactivate"}
                    </button>
                    <button onClick={() => removeSubscriber(s.id)} className="px-2 py-1 rounded text-xs text-red-400/50 hover:text-red-400 transition-colors">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Groups tab ── */}
          {tab === "groups" && (
            <div className="flex gap-6 min-h-0 flex-1">
              {/* Left: group list + create */}
              <div className="w-64 flex-shrink-0 flex flex-col gap-3">
                <div className="border border-white/8 bg-white/3 rounded-2xl p-4 flex flex-col gap-3">
                  <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">New Group</p>
                  <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" className={`${inputCls} w-full`} />
                  <input value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="Description (optional)" className={`${inputCls} w-full`} />
                  <button onClick={addGroup} disabled={groupSaving || !groupName.trim()} className={btnPrimary}>
                    {groupSaving ? "Creating…" : "Create Group"}
                  </button>
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto">
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => { setSelectedGroup(g); loadGroupMembers(g.id); }}
                      className={`${rowCls} flex-col items-start gap-0.5 cursor-pointer text-left ${selectedGroup?.id === g.id ? "border-sky-500/40 bg-sky-500/5" : ""}`}
                    >
                      <span className="text-sm text-white">{g.name}</span>
                      <span className="text-xs text-white/35">{g.memberCount ?? 0} members</span>
                    </button>
                  ))}
                  {groups.length === 0 && <p className="text-xs text-white/25 px-2">No groups yet.</p>}
                </div>
              </div>

              {/* Right: group members */}
              {selectedGroup ? (
                <div className="flex-1 border border-white/8 rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{selectedGroup.name}</h3>
                      {selectedGroup.description && <p className="text-xs text-white/40 mt-0.5">{selectedGroup.description}</p>}
                    </div>
                    <button onClick={() => deleteGroup(selectedGroup.id)} className="text-xs text-red-400/50 hover:text-red-400 transition-colors">Delete group</button>
                  </div>

                  {/* Current members */}
                  <div>
                    <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">Members ({groupMembers.length})</p>
                    <div className="flex flex-col gap-2">
                      {groupMembers.length === 0 && <p className="text-xs text-white/25">No members yet.</p>}
                      {groupMembers.map((m) => {
                        const label = m.memberType === "portal_user"
                          ? portalUsers.find((u) => u._id === m.memberId)?.email ?? m.memberId
                          : subscribers.find((s) => s.id === m.memberId)?.email ?? m.memberId;
                        return (
                          <div key={`${m.memberType}-${m.memberId}`} className={`${rowCls}`}>
                            <div>
                              <span className="text-sm text-white">{label}</span>
                              <span className="ml-2 text-xs text-white/30">{m.memberType === "portal_user" ? "portal user" : "subscriber"}</span>
                            </div>
                            <button onClick={() => removeMember(selectedGroup.id, m.memberType, m.memberId)} className="text-xs text-red-400/50 hover:text-red-400">Remove</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add portal users */}
                  <div>
                    <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">Add Portal Users</p>
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                      {portalUsers
                        .filter((u) => !groupMembers.some((m) => m.memberType === "portal_user" && m.memberId === u._id))
                        .map((u) => (
                          <button key={u._id} onClick={() => addMember(selectedGroup.id, "portal_user", u._id)} className={`${rowCls} justify-start gap-2 text-left`}>
                            <span className="text-xs text-sky-400">+</span>
                            <span className="text-sm text-white">{u.email}</span>
                            {u.name && <span className="text-xs text-white/35">{u.name}</span>}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Add subscribers */}
                  <div>
                    <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">Add Subscribers</p>
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                      {subscribers
                        .filter((s) => s.status === "active" && !groupMembers.some((m) => m.memberType === "subscriber" && m.memberId === s.id))
                        .map((s) => (
                          <button key={s.id} onClick={() => addMember(selectedGroup.id, "subscriber", s.id)} className={`${rowCls} justify-start gap-2 text-left`}>
                            <span className="text-xs text-sky-400">+</span>
                            <span className="text-sm text-white">{s.email}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-white/25 text-sm border border-white/8 rounded-2xl">
                  Select a group to manage members
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
