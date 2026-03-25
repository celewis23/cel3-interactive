"use client";

import { useState, useEffect, useCallback, useRef, DragEvent } from "react";
import { useRouter } from "next/navigation";
import type {
  AutomationNode,
  AutomationNodeGraph,
  AutomationTriggerType,
  ActionType,
  AutomationRun,
  AutomationSuggestion,
} from "@/lib/automations/types";
import {
  generateNodeId,
  TRIGGER_LABELS,
  ACTION_LABELS,
  summariseNode,
} from "@/lib/automations/types";
import NodeInspector from "./NodeInspector";
import TestRunPanel from "./TestRunPanel";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AutomationBuilderProps {
  initialAutomation: {
    _id: string;
    name: string;
    description?: string;
    triggerType: AutomationTriggerType;
    triggerConfig?: Record<string, unknown>;
    nodes: AutomationNodeGraph;
    enabled: boolean;
  } | null;
  initialRuns: AutomationRun[];
  forms: Array<{ _id: string; name: string }>;
  staff: Array<{ _id: string; name: string; email: string }>;
  automationId: string;
}

// ── Palette definition ────────────────────────────────────────────────────────

const PALETTE_TRIGGERS: Array<{ subtype: AutomationTriggerType; label: string; category: string }> = [
  { subtype: "contract_signed",      label: "Contract signed",    category: "Contracts" },
  { subtype: "contract_declined",    label: "Contract declined",  category: "Contracts" },
  { subtype: "invoice_paid_full",    label: "Invoice paid",       category: "Invoices" },
  { subtype: "invoice_overdue",      label: "Invoice overdue",    category: "Invoices" },
  { subtype: "invoice_sent",         label: "Invoice sent",       category: "Invoices" },
  { subtype: "form_completed",       label: "Form completed",     category: "Forms" },
  { subtype: "form_not_completed",   label: "Form not completed", category: "Forms" },
  { subtype: "booking_confirmed",    label: "Booking confirmed",  category: "Bookings" },
  { subtype: "lead_stage_changed",   label: "Lead stage changed", category: "Pipeline" },
  { subtype: "lead_created",         label: "Lead created",       category: "Pipeline" },
  { subtype: "client_created",       label: "Client created",     category: "Clients" },
  { subtype: "task_assigned",        label: "Task assigned",      category: "Tasks" },
  { subtype: "task_completed",       label: "Task completed",     category: "Tasks" },
  { subtype: "project_status_changed", label: "Project status changed", category: "Projects" },
  { subtype: "manual",               label: "Manual trigger",     category: "Manual" },
];

const PALETTE_ACTIONS: Array<{ subtype: ActionType; label: string }> = [
  { subtype: "send_email",                 label: "Send email" },
  { subtype: "send_sms",                   label: "Send SMS" },
  { subtype: "send_form",                  label: "Send form" },
  { subtype: "send_contract",              label: "Send contract" },
  { subtype: "send_invoice",               label: "Send invoice" },
  { subtype: "create_task",                label: "Create task" },
  { subtype: "add_client_tag",             label: "Add client tag" },
  { subtype: "remove_client_tag",          label: "Remove client tag" },
  { subtype: "move_lead_stage",            label: "Move lead stage" },
  { subtype: "change_project_status",      label: "Change project status" },
  { subtype: "send_internal_notification", label: "Internal notification" },
  { subtype: "webhook_post",               label: "Webhook POST" },
  { subtype: "activate_portal",            label: "Activate portal" },
  { subtype: "archive_project",            label: "Archive project" },
  { subtype: "pause_workflow",             label: "Pause workflow" },
];

// ── Colors ────────────────────────────────────────────────────────────────────

function nodeColors(type: string) {
  switch (type) {
    case "trigger":   return { border: "border-amber-500/40",  bg: "bg-amber-500/8",   badge: "bg-amber-500/20 text-amber-300",   icon: "text-amber-400" };
    case "delay":     return { border: "border-white/20",      bg: "bg-white/4",        badge: "bg-white/10 text-white/50",        icon: "text-white/50" };
    case "condition": return { border: "border-emerald-500/40",bg: "bg-emerald-500/8",  badge: "bg-emerald-500/20 text-emerald-300",icon: "text-emerald-400" };
    case "action":    return { border: "border-sky-500/40",    bg: "bg-sky-500/8",      badge: "bg-sky-500/20 text-sky-300",       icon: "text-sky-400" };
    default:          return { border: "border-white/10",      bg: "bg-white/4",        badge: "bg-white/10 text-white/50",        icon: "text-white/50" };
  }
}

// ── Node card icon ────────────────────────────────────────────────────────────

function NodeIcon({ type }: { type: string }) {
  switch (type) {
    case "trigger":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      );
    case "delay":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
        </svg>
      );
    case "condition":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      );
    case "action":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
        </svg>
      );
    default: return null;
  }
}

// ── Node card subtitle ────────────────────────────────────────────────────────

function nodeSubtitle(node: AutomationNode): string {
  switch (node.type) {
    case "trigger": {
      const cfg = node.config as { trigger_type: AutomationTriggerType };
      return TRIGGER_LABELS[cfg.trigger_type] ?? cfg.trigger_type;
    }
    case "delay": {
      const cfg = node.config as { amount: number; unit: string; mode: string };
      return cfg.mode === "fixed" ? "Waits until fixed date" : `Waits ${cfg.amount} ${cfg.unit}`;
    }
    case "condition": {
      const cfg = node.config as { conditions: unknown[]; logic: string };
      return `${cfg.logic === "all" ? "All" : "Any"} of ${cfg.conditions.length} condition${cfg.conditions.length !== 1 ? "s" : ""} must match`;
    }
    case "action": {
      const cfg = node.config as { action_type: ActionType; action_config: Record<string, unknown> };
      if (cfg.action_type === "send_email" && cfg.action_config?.subject) {
        return `Subject: ${String(cfg.action_config.subject).slice(0, 40)}`;
      }
      return ACTION_LABELS[cfg.action_type] ?? cfg.action_type;
    }
  }
}

// ── Flow renderer ─────────────────────────────────────────────────────────────

function FlowConnector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-px h-5 bg-white/15" />
      {label && (
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">{label}</span>
      )}
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-white/20">
        <path d="M0 0L5 6L10 0" fill="currentColor" />
      </svg>
    </div>
  );
}

interface NodeCardProps {
  node: AutomationNode;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  dragData?: string;
}

function NodeCard({ node, isSelected, onSelect, onDelete, dragData }: NodeCardProps) {
  const colors = nodeColors(node.type);
  const isFirst = node.type === "trigger";

  return (
    <div
      className={`relative w-72 rounded-xl border cursor-pointer transition-all ${colors.border} ${colors.bg}
        ${isSelected ? "ring-2 ring-sky-500/60 shadow-lg shadow-sky-500/10" : "hover:border-white/30"}
      `}
      onClick={onSelect}
    >
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`${colors.icon} flex-shrink-0`}><NodeIcon type={node.type} /></span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{summariseNode(node)}</div>
              <div className="text-xs text-white/40 mt-0.5 truncate">{nodeSubtitle(node)}</div>
            </div>
          </div>
          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${colors.badge}`}>
            {node.type}
          </span>
        </div>
      </div>
      {!isFirst && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
          title="Delete node"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

interface AddStepButtonProps {
  onDrop: (data: string) => void;
  onClick: () => void;
}

function AddStepButton({ onDrop, onClick }: AddStepButtonProps) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const data = e.dataTransfer.getData("automation/node");
        if (data) onDrop(data);
      }}
      className="flex flex-col items-center"
    >
      <div className="w-px h-4 bg-white/15" />
      <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
          over
            ? "border-sky-500 bg-sky-500/15 text-sky-400 scale-105"
            : "border-white/15 bg-white/4 text-white/40 hover:border-white/30 hover:text-white hover:bg-white/8"
        }`}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add step
      </button>
    </div>
  );
}

// ── Branch renderer (recursive) ───────────────────────────────────────────────

interface BranchProps {
  startNodeId: string | null;
  allNodes: AutomationNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAddAfter: (afterId: string | null, branch?: "yes" | "no") => void;
  branchLabel?: string;
  conditionParentId?: string;
  branch?: "yes" | "no";
  suggestions?: AutomationSuggestion[];
  onApplySuggestion?: (node: Omit<AutomationNode, "id" | "position">, afterId: string | null) => void;
}

function Branch({
  startNodeId,
  allNodes,
  selectedId,
  onSelect,
  onDelete,
  onAddAfter,
  branchLabel,
  conditionParentId,
  branch,
  suggestions,
  onApplySuggestion,
}: BranchProps) {
  // Build linear sequence from startNodeId (stops at condition branches)
  const sequence: AutomationNode[] = [];
  let current = startNodeId ? allNodes.find((n) => n.id === startNodeId) ?? null : null;

  while (current && current.type !== "condition") {
    sequence.push(current);
    current = current.next ? allNodes.find((n) => n.id === current!.next) ?? null : null;
  }
  const conditionNode = current?.type === "condition" ? current as Extract<AutomationNode, { type: "condition" }> : null;

  return (
    <div className="flex flex-col items-center">
      {branchLabel && (
        <div className="mb-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            branchLabel === "Yes" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
          }`}>{branchLabel}</span>
        </div>
      )}

      {sequence.map((node, i) => (
        <div key={node.id} className="flex flex-col items-center group">
          {i > 0 && <FlowConnector />}
          <NodeCard
            node={node}
            isSelected={selectedId === node.id}
            onSelect={() => onSelect(node.id)}
            onDelete={() => onDelete(node.id)}
          />
        </div>
      ))}

      {/* Condition split */}
      {conditionNode && (
        <div className="flex flex-col items-center">
          <FlowConnector />
          <div className="flex flex-col items-center group">
            <NodeCard
              node={conditionNode}
              isSelected={selectedId === conditionNode.id}
              onSelect={() => onSelect(conditionNode.id)}
              onDelete={() => onDelete(conditionNode.id)}
            />
          </div>

          {/* Two branches side by side */}
          <div className="flex gap-8 mt-3 items-start">
            <div className="flex flex-col items-center">
              <Branch
                startNodeId={conditionNode.branches.yes}
                allNodes={allNodes}
                selectedId={selectedId}
                onSelect={onSelect}
                onDelete={onDelete}
                onAddAfter={onAddAfter}
                branchLabel="Yes"
                conditionParentId={conditionNode.id}
                branch="yes"
                suggestions={selectedId === conditionNode.id ? suggestions : undefined}
                onApplySuggestion={onApplySuggestion}
              />
              <AddStepButton
                onDrop={(data) => onAddAfter(conditionNode.branches.yes, "yes")}
                onClick={() => onAddAfter(conditionNode.branches.yes, "yes")}
              />
            </div>

            <div className="w-px bg-white/8 self-stretch" />

            <div className="flex flex-col items-center">
              <Branch
                startNodeId={conditionNode.branches.no}
                allNodes={allNodes}
                selectedId={selectedId}
                onSelect={onSelect}
                onDelete={onDelete}
                onAddAfter={onAddAfter}
                branchLabel="No"
                conditionParentId={conditionNode.id}
                branch="no"
              />
              <AddStepButton
                onDrop={(data) => onAddAfter(conditionNode.branches.no, "no")}
                onClick={() => onAddAfter(conditionNode.branches.no, "no")}
              />
            </div>
          </div>

          {/* Merge point indicator */}
          <div className="mt-4 flex items-center gap-2 text-white/20">
            <div className="h-px w-16 bg-white/10" />
            <span className="text-[10px]">merge</span>
            <div className="h-px w-16 bg-white/10" />
          </div>
        </div>
      )}

      {/* Main add step + AI suggestions */}
      {!conditionNode && (
        <div className="flex flex-col items-center">
          <AddStepButton
            onDrop={(data) => onAddAfter(sequence[sequence.length - 1]?.id ?? null)}
            onClick={() => onAddAfter(sequence[sequence.length - 1]?.id ?? null)}
          />

          {/* AI suggestions */}
          {suggestions && suggestions.length > 0 && (
            <div className="mt-4 w-72">
              <div className="mb-2 text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                AI suggestions
              </div>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => onApplySuggestion?.(s.node, sequence[sequence.length - 1]?.id ?? null)}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-sky-500/5 border border-sky-500/15 hover:border-sky-500/40 hover:bg-sky-500/10 transition-all"
                  >
                    <div className="text-xs font-medium text-sky-300">{s.label}</div>
                    <div className="text-[11px] text-white/40 mt-0.5">{s.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Builder ──────────────────────────────────────────────────────────────

export default function AutomationBuilder({
  initialAutomation,
  initialRuns,
  forms,
  staff,
  automationId,
}: AutomationBuilderProps) {
  const router = useRouter();

  // ── State ────────────────────────────────────────────────────────────────

  const [name, setName] = useState(initialAutomation?.name ?? "Untitled automation");
  const [editingName, setEditingName] = useState(false);
  const [enabled, setEnabled] = useState(initialAutomation?.enabled ?? false);
  const [nodes, setNodes] = useState<AutomationNode[]>(
    initialAutomation?.nodes?.nodes ?? [
      {
        id: generateNodeId(),
        type: "trigger",
        position: { x: 0, y: 0 },
        config: { trigger_type: "manual" as AutomationTriggerType },
        next: null,
      },
    ]
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"configure" | "runlog">("configure");
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(initialAutomation?._id ?? null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [suggestions, setSuggestions] = useState<AutomationSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [runs, setRuns] = useState(initialRuns);

  // Auto-save every 30s
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirty = useRef(false);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  // ── Auto-save ─────────────────────────────────────────────────────────────

  useEffect(() => {
    isDirty.current = true;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (isDirty.current) save(true);
    }, 30000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, name, enabled]);

  // ── AI suggestions when node selected ────────────────────────────────────

  useEffect(() => {
    if (!selectedNodeId) return;
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node || node.type !== "action") return;

    setLoadingSuggestions(true);
    const triggerNode = nodes.find((n) => n.type === "trigger");

    fetch("/api/admin/automations/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_nodes: nodes,
        insertion_point: selectedNodeId,
        branch: "main",
        org_context: {
          industry: "agency",
          active_modules: ["projects", "billing", "contracts", "forms"],
          integrations: ["google_workspace", "stripe", "resend"],
        },
        trigger_type: (triggerNode?.config as { trigger_type: string })?.trigger_type ?? "manual",
      }),
    })
      .then((r) => r.json())
      .then((d) => setSuggestions(d.suggestions ?? []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoadingSuggestions(false));
  }, [selectedNodeId, nodes]);

  // ── Save ─────────────────────────────────────────────────────────────────

  const save = useCallback(async (silent = false) => {
    if (!silent) setSaving(true);
    try {
      const graph = { nodes };
      const payload = {
        name,
        enabled,
        nodes: graph,
        triggerType: (nodes.find((n) => n.type === "trigger")?.config as { trigger_type: AutomationTriggerType })?.trigger_type ?? "manual",
      };

      let id = currentId;
      if (!id) {
        const res = await fetch("/api/admin/automations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        id = data._id;
        setCurrentId(id);
        router.replace(`/admin/automations/${id}/builder`);
      } else {
        await fetch(`/api/admin/automations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      isDirty.current = false;
      if (!silent) { setSavedOk(true); setTimeout(() => setSavedOk(false), 2000); }
    } finally {
      if (!silent) setSaving(false);
    }
  }, [nodes, name, enabled, currentId, router]);

  // ── Node mutations ────────────────────────────────────────────────────────

  const updateNode = useCallback((id: string, newConfig: AutomationNode["config"]) => {
    setNodes((prev) => prev.map((n) => n.id === id ? { ...n, config: newConfig } as AutomationNode : n));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes((prev) => {
      const newNodes = [...prev];
      // Find parent that points to this node
      for (const n of newNodes) {
        if (n.next === id) (n as { next: string | null }).next = (newNodes.find((x) => x.id === id) as { next: string | null })?.next ?? null;
        if (n.type === "condition") {
          if (n.branches.yes === id) n.branches.yes = null;
          if (n.branches.no === id) n.branches.no = null;
        }
      }
      return newNodes.filter((n) => n.id !== id);
    });
    if (selectedNodeId === id) setSelectedNodeId(null);
  }, [selectedNodeId]);

  const addNodeAfter = useCallback((afterId: string | null, droppedData?: string, branch?: "yes" | "no") => {
    // droppedData is JSON string from palette drag, or we show a quickadd menu
    let nodeTemplate: Partial<AutomationNode> | null = null;

    if (droppedData) {
      try { nodeTemplate = JSON.parse(droppedData); } catch { return; }
    } else {
      // Default: add a send_email action
      nodeTemplate = {
        type: "action",
        config: { action_type: "send_email", action_config: { to: "client", subject: "", body_html: "" }, require_approval: false, on_error: "skip" },
      };
    }

    if (!nodeTemplate) return;

    const newId = generateNodeId();
    const newNode: AutomationNode = {
      id: newId,
      type: nodeTemplate.type ?? "action",
      position: { x: 0, y: 0 },
      config: nodeTemplate.config ?? {},
      next: null,
      ...(nodeTemplate.type === "condition" ? { branches: { yes: null, no: null } } : {}),
    } as AutomationNode;

    setNodes((prev) => {
      const updated = prev.map((n) => {
        if (afterId && n.id === afterId) {
          // For condition node branches
          if (branch && n.type === "condition") {
            return { ...n, branches: { ...n.branches, [branch]: newId } };
          }
          const oldNext = (n as { next: string | null }).next;
          (newNode as { next: string | null }).next = oldNext;
          return { ...n, next: newId };
        }
        return n;
      });
      // If afterId is null (empty branch), just append
      if (!afterId) {
        return [...updated, newNode];
      }
      return [...updated, newNode];
    });

    setSelectedNodeId(newId);
  }, []);

  const applySuggestion = useCallback((nodeTemplate: Omit<AutomationNode, "id" | "position">, afterId: string | null) => {
    const newId = generateNodeId();
    const newNode: AutomationNode = {
      id: newId,
      position: { x: 0, y: 0 },
      ...nodeTemplate,
    } as AutomationNode;

    setNodes((prev) => {
      const updated = prev.map((n) =>
        n.id === afterId ? { ...n, next: newId } : n
      );
      const newNodeWithNext: AutomationNode = {
        ...newNode,
        next: afterId ? (prev.find((n) => n.id === afterId) as { next: string | null } | undefined)?.next ?? null : null,
      } as AutomationNode;
      return [...updated, newNodeWithNext];
    });
    setSelectedNodeId(newId);
    setSuggestions([]);
  }, []);

  // ── Toggle enabled ────────────────────────────────────────────────────────

  const toggleEnabled = async () => {
    const newVal = !enabled;
    setEnabled(newVal);
    if (currentId) {
      await fetch(`/api/admin/automations/${currentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newVal }),
      });
    }
  };

  // ── Drag from palette ─────────────────────────────────────────────────────

  const onPaletteDragStart = (e: DragEvent<HTMLDivElement>, nodeData: object) => {
    e.dataTransfer.setData("automation/node", JSON.stringify(nodeData));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const triggerNode = nodes.find((n) => n.type === "trigger");

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* ── Palette ── */}
      <aside className="w-48 flex-shrink-0 bg-[#0a0a0a] border-r border-white/8 flex flex-col overflow-y-auto">
        <div className="px-3 pt-4 pb-2">
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Triggers</span>
        </div>
        {PALETTE_TRIGGERS.map((t) => (
          <div
            key={t.subtype}
            draggable
            onDragStart={(e) => onPaletteDragStart(e, {
              type: "trigger",
              config: { trigger_type: t.subtype },
            })}
            className="mx-2 mb-1 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20 cursor-grab active:cursor-grabbing hover:border-amber-500/40 transition-colors"
          >
            <div className="text-xs text-amber-300 font-medium truncate">{t.label}</div>
            <div className="text-[10px] text-amber-400/50">{t.category}</div>
          </div>
        ))}

        <div className="px-3 pt-3 pb-2">
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Logic</span>
        </div>
        {[
          { type: "condition", label: "Condition (if/else)", color: "emerald" },
          { type: "delay", label: "Delay", color: "white" },
        ].map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onPaletteDragStart(e, {
              type: item.type,
              config: item.type === "delay"
                ? { amount: 1, unit: "days", mode: "relative" }
                : { logic: "all", conditions: [{ field: "project.budget", operator: "greater_than", value: "" }], on_error: "skip" },
              ...(item.type === "condition" ? { branches: { yes: null, no: null } } : {}),
            })}
            className={`mx-2 mb-1 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:border-white/30 transition-colors ${
              item.type === "condition"
                ? "bg-emerald-500/8 border border-emerald-500/20 hover:border-emerald-500/40"
                : "bg-white/4 border border-white/10"
            }`}
          >
            <div className={`text-xs font-medium truncate ${item.type === "condition" ? "text-emerald-300" : "text-white/60"}`}>{item.label}</div>
          </div>
        ))}

        <div className="px-3 pt-3 pb-2">
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Actions</span>
        </div>
        {PALETTE_ACTIONS.map((a) => (
          <div
            key={a.subtype}
            draggable
            onDragStart={(e) => onPaletteDragStart(e, {
              type: "action",
              config: {
                action_type: a.subtype,
                action_config: {},
                require_approval: false,
                on_error: "skip",
              },
            })}
            className="mx-2 mb-1 px-3 py-2 rounded-lg bg-sky-500/8 border border-sky-500/20 cursor-grab active:cursor-grabbing hover:border-sky-500/40 transition-colors"
          >
            <div className="text-xs text-sky-300 font-medium truncate">{a.label}</div>
          </div>
        ))}
        <div className="h-8" />
      </aside>

      {/* ── Canvas ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/8 bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/automations")}
              className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Automations
            </button>
            <span className="text-white/20">/</span>
            {editingName ? (
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingName(false); }}
                className="bg-white/5 border border-white/20 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-sky-500/50 w-56"
              />
            ) : (
              <button onClick={() => setEditingName(true)} className="text-sm font-semibold text-white hover:text-sky-300 transition-colors">
                {name}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Enable toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50">{enabled ? "Enabled" : "Disabled"}</span>
              <button
                onClick={toggleEnabled}
                className={`relative w-9 h-5 rounded-full transition-colors ${enabled ? "bg-sky-500" : "bg-white/15"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <button
              onClick={() => setShowTestPanel(true)}
              className="px-3 py-1.5 rounded-lg border border-white/15 text-sm text-white/70 hover:text-white hover:border-white/30 transition-colors"
            >
              Test run
            </button>

            <button
              onClick={() => save(false)}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black text-sm font-semibold transition-colors"
            >
              {saving ? "Saving…" : savedOk ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>

        {/* Canvas scroll area */}
        <div className="flex-1 overflow-auto">
          <div className="flex justify-center pt-8 pb-24 px-8 min-w-max">
            <Branch
              startNodeId={triggerNode?.id ?? null}
              allNodes={nodes}
              selectedId={selectedNodeId}
              onSelect={setSelectedNodeId}
              onDelete={deleteNode}
              onAddAfter={addNodeAfter}
              suggestions={selectedNodeId && nodes.find((n) => n.id === selectedNodeId)?.type === "action" ? suggestions : []}
              onApplySuggestion={applySuggestion}
            />
          </div>
        </div>
      </div>

      {/* ── Inspector ── */}
      <aside className="w-64 flex-shrink-0 bg-[#0a0a0a] border-l border-white/8 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-white/8 flex-shrink-0">
          {(["configure", "runlog"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setInspectorTab(tab)}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                inspectorTab === tab
                  ? "text-sky-400 border-b-2 border-sky-400"
                  : "text-white/40 hover:text-white"
              }`}
            >
              {tab === "configure" ? "Configure" : "Run log"}
            </button>
          ))}
        </div>

        {inspectorTab === "configure" ? (
          <div className="flex-1 overflow-y-auto">
            {selectedNode ? (
              <NodeInspector
                node={selectedNode}
                allNodes={nodes}
                forms={forms}
                staff={staff}
                onChange={(config) => updateNode(selectedNode.id, config)}
                suggestions={loadingSuggestions ? [] : suggestions}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/15 mb-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                </svg>
                <p className="text-xs text-white/30">Click a node to configure it</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {runs.length === 0 ? (
              <p className="text-xs text-white/30 text-center pt-8">No runs yet</p>
            ) : (
              runs.map((run) => (
                <RunLogRow key={run._id} run={run} />
              ))
            )}
          </div>
        )}
      </aside>

      {/* Test panel */}
      {showTestPanel && (
        <TestRunPanel
          automationId={currentId}
          triggerType={(nodes.find((n) => n.type === "trigger")?.config as { trigger_type: AutomationTriggerType })?.trigger_type ?? "manual"}
          nodes={nodes}
          onClose={() => setShowTestPanel(false)}
          onRunComplete={(run) => {
            setRuns((prev) => [run as unknown as AutomationRun, ...prev]);
            setShowTestPanel(false);
            setInspectorTab("runlog");
          }}
        />
      )}
    </div>
  );
}

// ── Run log row ───────────────────────────────────────────────────────────────

function RunLogRow({ run }: { run: AutomationRun & { steps?: Array<{ nodeLabel?: string; status: string; error?: string }> } }) {
  const [expanded, setExpanded] = useState(false);

  const statusColor = {
    completed: "bg-emerald-500",
    failed:    "bg-red-500",
    running:   "bg-sky-500 animate-pulse",
    skipped:   "bg-white/30",
    dry_run:   "bg-amber-500",
  }[run.status] ?? "bg-white/20";

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/70 truncate">
            {run.isDryRun ? "🧪 Dry run" : (run.triggeredByClientId ?? run.triggeredByEntityType ?? "Manual")}
          </div>
          <div className="text-[10px] text-white/30">{new Date(run.startedAt).toLocaleString()}</div>
        </div>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`flex-shrink-0 text-white/30 transition-transform ${expanded ? "rotate-180" : ""}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {expanded && (run as { steps?: unknown[] }).steps && (
        <div className="px-3 pb-3 space-y-1 border-t border-white/8 pt-2">
          {((run as { steps?: Array<{ nodeLabel?: string; status: string; error?: string }> }).steps ?? []).map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                s.status === "completed" ? "bg-emerald-500" :
                s.status === "failed"    ? "bg-red-500" :
                s.status === "skipped"   ? "bg-white/30" : "bg-white/20"
              }`} />
              <span className="text-white/60 truncate">{s.nodeLabel ?? s.status}</span>
              {s.error && <span className="text-red-400/70 truncate">{s.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
